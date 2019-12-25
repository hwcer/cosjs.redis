"use strict"
const HFMT   = require('../hfmt');
const cosjs_redis   = require('./index');

module.exports = class redis_hash extends cosjs_redis{
    constructor(opts,prefix,FormatOpts){
        super(opts,prefix);
        this._FormatOpts = FormatOpts||null;
    }

    get(key,field) {
        if ( !field ) {
            return HFMT.hgetall.call(this,key);
        }
        else if (Array.isArray(field)) {
            return HFMT.hmget.call(this, key, field);
        }
        else {
            return HFMT.hget.call(this,key, field,);
        }
    }

    set(key,field,value) {
        let rkey = this.rkey(key);
        let redis = this.connect();
        if (typeof(field) === 'object') {
            let rows = {};
            for (let k in field) {
                rows[k] = typeof field[k] === 'object' ? cosjs_redis.toString(field[k]) : field[k];
            }
            return redis.hmset(rkey, rows);
        }
        else {
            if (typeof(value) === 'object') {
                value = cosjs_redis.toString(value);
            }
            return redis.hset(rkey, field, value);
        }
    }

    del(key,field){
        if( !field ){
            return super.del(key);
        }
        else {
            let rkey = this.rkey(key);
            let redis = this.connect();
            return redis.hdel(rkey, field);
        }
    }

    incr(key) {
        let redis = this.connect();
        arguments[0] = this.rkey(key);
        return redis.hincrby.apply(redis, arguments);
    }
    //id,[key]
    exists(key,field){
        if (field) {
            let rkey = this.rkey(key);
            let redis = this.connect(true);
            return redis.hexists(rkey, field);
        }
        else {
            return super.exists(key);
        }
    }
}
