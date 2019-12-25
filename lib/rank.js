"use strict"
//排行榜
const redis = require('./index');

module.exports = class redis_rank extends redis{

    constructor(RedisKey,PrefixChar) {
        super(RedisKey,PrefixChar);
        this.order = 'desc';
        this.doomsday = false;
        this._RankLimitOpt = [0,5000];       //排行榜最大人数，超过之后会被删除,5000:每次清理时间间隔
    }

    //是否在Score后面加时间标记避免重复
    stamp(stime){
        this.doomsday = stime||'2200-01-01';
        return this;
    }
    //设置排行榜长度
    limit(val){
        this._RankLimitOpt[0] = val;
        if(arguments[1]){
            this._RankLimitOpt[1] = arguments[1];
        }
        return this;
    }

    //获取个人排名,-1:未上榜，0：开始
    get(key) {
        let hash  = this.rkey();
        let redis = this.connect(true);
        let cmd = this.order == 'desc' ?'zrevrank':'zrank';
        return redis[cmd](hash, key).then(ret=>{
            return ret === null ? -1 : ret;
        })
    }
    //设置SCORE
    set(key, val) {
        let hash  = this.rkey();
        let score = getTimeStampScore.call(this,val);
        let redis = this.connect();
        return redis.zadd(hash,score,key).then(ret=>{
            setRankLimit.call(this,redis,hash);
            return ret;
        })
    }
    //删除排名
    del() {
        let hash  = this.rkey();
        let redis = this.connect();
        Array.prototype.unshift.call(arguments,hash);
        if( arguments[1] && typeof arguments[1] !== 'function' ){
            return redis.zrem.apply(redis,arguments);
        }
        else{
            return redis.del.apply(redis,arguments);
        }
    }
    //获取值
    val(key) {
        let hash  = this.rkey();
        let redis = this.connect(true);
        Array.prototype.unshift.call(arguments,hash);
        return redis.zscore.apply(redis, arguments);
    }
    //递增值
    incr(key,val) {
        let hash  = this.rkey();
        let redis = this.connect();
        return Promise.resolve().then(()=>{
            if(!this.doomsday){
                return redis.zincrby(hash, val,key);
            }
            else{
                return redis.zscore(hash,key);
            }
        }).then(ret=>{
            if(!this.doomsday){
                return ret;
            }
            let old = Math.floor(ret)||0;
            let score = getTimeStampScore.call(this,old + val);
            return redis.zadd(hash,score,key).then(()=>score);
        }).then(ret=>{
            setRankLimit.call(this,redis,hash);
            return ret;
        })
    }
    size(){
        let hash  = this.rkey();
        let redis = this.connect(true);
        Array.prototype.unshift.call(arguments,hash);
        return redis.zcard.apply(redis,arguments);
    }
    //按名次分段获取
    range(start,stop) {
        let WITHSCORES = arguments[2];
        let hash  = this.rkey();
        let redis = this.connect(true);

        let arr = [hash,start,stop];
        if(WITHSCORES){
            arr.push('WITHSCORES');
        }
        if(this.order === 'desc' ){
            return redis.zrevrange.apply(redis, arr);
        }
        else{
            return redis.zrange.apply(redis, arr);
        }
    }
    //按积分分段获取,ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
    rangeByScore(min,max,WITHSCORES,limit, offset, count) {
        let hash  = this.rkey();
        let redis = this.connect(true);
        if(arguments[2] && typeof arguments[2] != 'function'){
            arguments[2] == 'WITHSCORES';
        }
        Array.prototype.unshift.call(arguments,hash);

        if(this.order === 'desc' ){
            return redis.zrevrangebyscore.apply(redis,arguments);
        }
        else{
            return redis.zrangebyscore.apply(redis,arguments);
        }
    }
};

//清理排行榜多余数据
function setRankLimit(redis,hash) {
    if(!this._RankLimitOpt[0]){
        return ;
    }
    let k = ['','rank','limit',hash].join('_');
    let time = Date.now();
    if( redis[k] && ( time - redis[k] ) < this._RankLimitOpt[1] ){
        return;
    }
    redis[k] = time;
    return redis.zcard(hash).then(ret=>{
        if( ret <= this._RankLimitOpt[0] ){
            return Promise.reject();
        }
        let s,e;
        if(this.order === 'desc'){
            s=0;e=ret - this._RankLimitOpt[0] - 1;
        }
        else{
            s=this._RankLimitOpt[0];e=-1;
        }
        return redis.zremrangebyrank(hash, s, e);

    }).catch(err=>{
        if(process.env.NODE_ENV === 'development'){
            console.log(err);
        }
    })
}

function getTimeStampScore(val){
    if(!this.doomsday){
        return val;
    }
    let suffix;
    if(this.order == 'desc'){
        let nowtime = parseInt(Date.now() / 1000 );
        let doomsday = parseInt(Date.parse(this.doomsday) / 1000 );
        suffix = doomsday - nowtime;
    }
    else{
        suffix = parseInt(Date.now() / 1000 );
    }

    return parseFloat([val,suffix].join('.'));
}

