require('../Helper').invalidateNodeCache();

const fs = require('fs');
const { assert, expect } = require('chai');
const log = require('null-logger');

const USERS_FILE = process.env.USERS_FILE || 'users.json';
const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

const AuthController = require('../../controller/auth.controller')(log);

describe('Auth Controller', () => {
  it('should return acl', async () => {
    const acl = AuthController.getAcl();

    assert.isDefined(acl);
    assert.isFunction(acl.allow);
    assert.isFunction(acl.addUserRoles);
  });

  it('should return middleware', async () => {
    const middleware = AuthController.getAclMiddleware();

    assert.isDefined(middleware);
  });

  it('should check password', async () => {
    const admin = users[0];
    const foundAdmin = await AuthController.checkUserPassword(admin.email, admin.password);

    expect(admin).to.deep.equal(foundAdmin);
  });

  it('should return jwt token', async () => {
    const admin = users[0];
    const adminJwt = await AuthController.signJWT(admin);

    assert.isString(adminJwt);
  });
});
