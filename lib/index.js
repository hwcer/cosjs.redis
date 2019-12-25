"use strict"
const ioredis = require('ioredis');

class redis{
    constructor(opts,prefix){
        this.unique       = 0;
        this._RedisConn   = redis_connect(opts);
        this._RedisMulti  = null;
        this._PrefixChar  = prefix||null;
        this._PrefixSplit = '|';
    }
    //获取封装后的真实KEY
    rkey(key){
        let arr = [];
        if(Array.isArray(this._PrefixChar)){
            arr = arr.concat(this._PrefixChar);
        }
        else if(this._PrefixChar){
            arr.push(this._PrefixChar);
        }
        if(Array.isArray(key)){
            arr = arr.concat(key);
        }
        else if(key){
            arr.push(key);
        }
        return arr.join(this._PrefixSplit);
    }
    save() {
        if(!this._RedisMulti){
            return Promise.reject('redisErr:use save but multi empty');
        }
        return this._RedisMulti.exec().then((ret)=> {
            this._RedisMulti = null;
            return ret;
        } )
    }
    //复制新对象防止实例缓存导致开启multi出现各种怪异现象
    multi(){
        if(this._RedisMulti){
            return this;
        }
        else if(this.unique){
            let newRedis = Object.create(this);
            newRedis['_RedisMulti'] = newRedis._RedisConn.multi();
            return newRedis;
        }
        else {
            this._RedisMulti = this._RedisConn.multi();
            return this;
        }
    }
    //expire 时间戳(MS),或者秒
    expire(key,expire){
        let redis = this.connect();
        let time = Date.now();
        let cmd = expire >= time ? 'pexpireat':'expire';
        arguments[0] = this.rkey(key);
        return redis[cmd].apply(redis,arguments);
    }

    ttl(key){
        arguments[0] = this.rkey(key);
        let redis = this.connect();
        return redis.ttl.apply(redis, arguments);
    }

    del(key){
        arguments[0] = this.rkey(key);
        let redis = this.connect();
        return redis.del.apply(redis, arguments);
    }

    exists(key){
        arguments[0] = this.rkey(key);
        let redis = this.connect(true);
        return redis.exists.apply(redis, arguments);
    }

    connect(read){
        if(read){
            return this._RedisConn;
        }
        else {
            return this._RedisMulti || this._RedisConn;
        }
    }

}

function redis_connect(opts,duplicate){
    let redis;
    if ( opts instanceof ioredis || opts instanceof (ioredis.Cluster)  ) {
        redis = duplicate ? opts.duplicate() : opts ;
    }
    else if(Array.isArray(opts)){
        redis = new ioredis.Cluster(opts);
    }
    else if(typeof opts === 'object' && Array.isArray(opts['cluster'])){
        redis = new ioredis.Cluster(opts['cluster'],opts['options']||{});
    }
    else if(typeof opts === 'object' ){
        redis = new ioredis(opts);
    }
    else{
        let url = 'redis://' + opts;
        redis = new ioredis(url);
    }
    if(redis && redis.listenerCount('error') < 1 ){
        redis.on('error',(err)=>{
            console.error('RedisErr',err);
        });
    }
    return redis;
}

function redis_toString(val){
    if( !val && typeof val !== 'number'){
        return "";
    }
    if( val && typeof val.toJSON === 'function'){
        return val.toJSON();
    }
    else if(val && typeof val === 'object'){
        return JSON.stringify(val);
    }
    else{
        return val;
    }
}


module.exports = redis;
module.exports.connect = redis_connect;
module.exports.toString = redis_toString;