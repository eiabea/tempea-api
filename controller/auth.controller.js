const fs = require('fs');
const NodeACL = require('acl');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const ExtractJwt = passportJWT.ExtractJwt;
const Strategy = passportJWT.Strategy;
const params = {
  secretOrKey: process.env.JWT_SECRET || 'voohieT9ahShoowo1raJidaeb3tionga',
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT')
};

const ACL_PREFIX = process.env.ACL_PREFIX || 'acl_';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const USERS_FILE = process.env.USERS_FILE || 'users.json';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

module.exports = (log)=>{
  this.log = log.child({controller: 'auth'});

  const initAcl = ()=>{
    this.log.trace({func: 'initAcl'}, 'Initializing acl with redis backend');
    this.redisClient = redis.createClient({
      host: REDIS_HOST,
      port: REDIS_PORT
    });
    // eslint-disable-next-line new-cap
    this.acl = new NodeACL(new NodeACL.redisBackend(this.redisClient, ACL_PREFIX));
    this.log.trace({func: 'initAcl'}, 'Allowing default routes');
    this.acl.allow('flatmate', '/v1/status/mode', 'post');
    // adding admin user on position 0 to flatmate role
    this.acl.addUserRoles(users[0].guid, 'flatmate');
  };

  const initPassport = ()=>{
    this.log.trace({func: 'initPassport'}, 'Initializing passport with mocked users');
    const strategy = new Strategy(params, (payload, done) => {
      let user = users.find(elem=>{
        return elem.guid === payload.guid;
      });
      if (user) {
        return done(null, {
          guid: user.guid
        });
      }
      return done(new Error('User not found'), null);
    });

    passport.use(strategy);
    return passport.initialize();
  };

  const init = ()=>{
    initAcl();
    return initPassport();
  };

  const allow = (group, resource, method)=>{
    this.acl.allow(group, resource, method);
  };

  const addUserRoles = (user, group)=>{
    this.acl.addUserRoles(user, group);
  };

  const authorize = (numPathComponents) => {
    return this.acl.middleware(numPathComponents || 0, req=>{
      return req.user.guid;
    });
  };

  const authenticate = () => {
    return passport.authenticate('jwt', {session: false});
  };

  const checkUserPassword = async(email, password) => {
    return users.find((u) => {
      return u.email === email && u.password === password;
    });
  };

  const signJWT = (payload)=>{
    return jwt.sign(payload, params.secretOrKey, {
      expiresIn: JWT_EXPIRES_IN
    });
  };

  return {
    init,
    allow,
    addUserRoles,
    authorize,
    authenticate,
    checkUserPassword,
    signJWT
  };
};
