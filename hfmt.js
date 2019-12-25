"use strict"
//主要HASH操作
const cosjs_library = require('cosjs.library');
const cosjs_format  = cosjs_library.require('format');



exports.hget = function hget(key, field) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    return redis.hget(rkey, field ).then(ret =>{
        if ( !ret ) {
            return ret;
        }
        let val;
        if(this._FormatOpts){
            let valType = (typeof this._FormatOpts === 'object' && this._FormatOpts[field]) ? this._FormatOpts[field]['type'] : this._FormatOpts;
            val = cosjs_format.parse(ret, valType)
        }
        else{
            val = ret;
        }
        return val;
    });
}

exports.hmget = function hmget(key, field) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    return redis.hmget(rkey, field).then(ret=> {
        if (!ret) {
            return ret;
        }
        let data = {};
        for(let i in field){
            let k = field[i];
            if(ret[i] !== null){
                data[k] = ret[i];
            }
        }
        if( this._FormatOpts && Object.keys(data).length > 0){
            cosjs_format(data,this._FormatOpts);
        }
        return data;
    });
}

exports.hgetall = function hgetall(key) {
    let rkey = this.rkey(key);
    let redis = this.connect(true);
    return redis.hgetall(rkey).then(ret=>{
        if( !ret || Object.keys(ret).length === 0){
            return null;
        }
        if( this._FormatOpts ){
            cosjs_format(ret,this._FormatOpts);
        }
        return ret;
    })
}


exports.format = cosjs_format;