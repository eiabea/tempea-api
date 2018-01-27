const fs = require('fs');
const NodeACL = require('acl');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const { ExtractJwt, Strategy } = passportJWT;
const params = {
  secretOrKey: process.env.JWT_SECRET || 'voohieT9ahShoowo1raJidaeb3tionga',
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
};

const ACL_PREFIX = process.env.ACL_PREFIX || 'acl_';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const USERS_FILE = process.env.USERS_FILE || 'users.json';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

module.exports = (log) => {
  let redisClient;
  let acl;
  let aclMiddleware;

  const initAcl = () => {
    log.trace({ func: 'initAcl' }, 'Initializing acl with redis backend');
    redisClient = redis.createClient({
      host: REDIS_HOST,
      port: REDIS_PORT,
    });
    // eslint-disable-next-line new-cap
    acl = new NodeACL(new NodeACL.redisBackend(redisClient, ACL_PREFIX));
    log.trace({ func: 'initAcl' }, 'Allowing default routes');
    acl.allow('flatmate', '/v1/status/mode', 'post');
    // adding admin user on position 0 to flatmate role
    acl.addUserRoles(users[0].guid, 'flatmate');
  };

  const initPassport = () => {
    log.trace({ func: 'initPassport' }, 'Initializing passport with mocked users');
    const strategy = new Strategy(params, (payload, done) => {
      const user = users.find(elem => elem.guid === payload.guid);
      if (user) {
        return done(null, {
          guid: user.guid,
        });
      }
      return done(new Error('User not found'), null);
    });

    passport.use(strategy);
    aclMiddleware = passport.initialize();
  };

  initAcl();
  initPassport();

  const getAclMiddleware = () => aclMiddleware;

  const allow = (group, resource, method) => {
    acl.allow(group, resource, method);
  };

  const addUserRoles = (user, group) => {
    acl.addUserRoles(user, group);
  };

  const authorize = (numPathComponents) => {
    acl.middleware(numPathComponents || 0, req => req.user.guid);
  };

  const authenticate = () => passport.authenticate('jwt', { session: false });

  const checkUserPassword = async (email, password) => {
    users.find(u => u.email === email && u.password === password);
  };

  const signJWT = payload => jwt.sign(payload, params.secretOrKey, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    allow,
    addUserRoles,
    authorize,
    authenticate,
    checkUserPassword,
    signJWT,
    getAclMiddleware,
  };
};
