"use strict"
//结构体，省去HASH KEY 简化操作
const HFMT   = require('../hfmt');
const cosjs_redis   = require('./index');

exports = module.exports = class redis_struct extends cosjs_redis{
    constructor(opts,prefix,FormatOpts){
        super(opts,prefix);
        this._FormatOpts = FormatOpts||null;
    }

    get(field) {
        if ( !field ) {
            return HFMT.hgetall.call(this,null);
        }
        else if (Array.isArray(field)) {
            return HFMT.hmget.call(this, null, field);
        }
        else {
            return HFMT.hget.call(this,null, field,);
        }
    }

    set(field,value) {
        let rkey = this.rkey();
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

    del(field){
        if( !field ){
            return super.del();
        }
        else {
            let rkey = this.rkey();
            let redis = this.connect();
            return redis.hdel(rkey, field);
        }
    }

    incr() {
        let redis = this.connect();
        let rkey = this.rkey();
        return redis.hincrby.call(redis, rkey,...arguments);
    }

    ttl(){
        return super.ttl(null);
    }

    expire(ttl){
        return super.exists(null,ttl);
    }
    //id,[key]
    exists(field){
        if (field) {
            let rkey = this.rkey();
            let redis = this.connect(true);
            return redis.hexists(rkey, field);
        }
        else {
            return super.exists();
        }
    }
}
