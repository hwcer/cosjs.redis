//redis 并发锁
"use strict"
const redis = require('./string');
const cosjs_library = require('cosjs.library');
const cosjs_promise = cosjs_library.require("promise");

class redis_locks extends redis{
    constructor(opts,PrefixChar,expire){
        super(opts,PrefixChar);

        this.delayNum   = 10;                    //最大重试次数
        this.delayTime  = 0;                     //延时间隔

        this._tryingNum    = 0                    //当前延时次数
        this._lockedKey    = new Set();            //已经锁定的key
        this._lockExpire   = expire || 5;          //锁定时间(S)
    }

    start(id){
        let arr = Array.isArray(id) ? id : [id];
        let redisMulti = this.multi();
        for(let id of arr){
            redisMulti.incr(id,1);
            redisMulti.expire(id, this._lockExpire);
        }
        return redisMulti.save().then(ret=>{
            let unlock=[];
            for(let i=0;i < ret.length;i++){
                let k = arr[i];
                let v = ret[i][1];
                if( v > 1){
                    unlock.push(k)
                }
                else{
                    this._lockedKey.add(k);
                }
            }
            return lock_result.call(this,unlock);
        })
    }

    clear(){
        this._tryingNum = 0;

        if(this._lockedKey.size < 1){
            return Promise.resolve(0);
        }
        let redisMulti = this.multi();
        for(let id of this._lockedKey){
            redisMulti.del(id);
        }
        this._lockedKey.clear();
        return redisMulti.save();
    }
}

module.exports = redis_locks;



function lock_result(unlock){
    if( unlock.length == 0 || !this.delayNum || !this.delayTime || this._tryingNum >= this.delayNum ){
        return Promise.resolve(unlock);
    }
    else{
        this._tryingNum ++;
        return cosjs_promise.timeout.call(this,this.delayTime,'start',unlock);
    }
}