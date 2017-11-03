const NodeACL = require('acl');
const redis = require('redis');
const ACL_PREFIX = process.env.ACL_PREFIX || 'acl_';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || '6379';

module.exports = (log)=>{
  this.log = log;
  this.redisClient = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT
  });
  this.acl = new NodeACL(new NodeACL.redisBackend(this.redisClient, ACL_PREFIX));

  const getMiddleware = ()=>{
    return this.acl.middleware();
  };

  const allow = (group, resource, method)=>{
    this.acl.allow(group, resource, method);
  };

  const addUserRoles = (user, group)=>{
    this.acl.addUserRoles(user, group);
  };

  return {
    allow,
    addUserRoles,
    getMiddleware
  };
};
