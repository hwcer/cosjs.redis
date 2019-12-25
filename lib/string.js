"use strict"
//基于redis的缓存
const redis = require('./index');

module.exports = class redis_string extends redis{
    constructor(opts,PrefixChar) {
        super(opts,PrefixChar);
    }

    get(key) {
        let redis = this.connect(true);
        arguments[0] = this.rkey(key);
        if (Array.isArray(key)) {
            return redis.mget.apply(redis,arguments);
        }
        else {
            return redis.get.apply(redis,arguments);
        }
    }

    set(key, val, expire) {
        //获取CONN
        let redis = this.connect();
        if (typeof(key) === 'object') {
            let data = {};
            for (let k in key) {
                let rk = this.rkey(k);
                data[rk] = typeof key[k] === 'object' ? JSON.stringify(key[k]) : key[k];
            }
            return redis.mset(data);
        }
        else {
            if (typeof(val) === 'object') {
                val = JSON.stringify(val);
            }
            let rkey = this.rkey(key);
            if(expire){
                let time = Date.now();
                let ttl = (expire >= time) ? parseInt((expire - time)/1000) : expire;
                return redis.setex(rkey, ttl, val);
            }
            else{
                return redis.set(rkey, val);
            }
        }
    }

    incr(key) {
        let redis = this.connect();
        arguments[0] = this.rkey(key);
        return redis.incrby.apply(redis,arguments);
    }

    decr(key) {
        let redis = this.connect();
        arguments[0] = this.rkey(key);
        return redis.decr.apply(redis,arguments);
    }
};

