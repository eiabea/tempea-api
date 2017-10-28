const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'tempea', level: 10});
const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const StatusRoute = require('./routes/v1/status.route')(log.child({route: 'status'}));

(async function() {
  log.info('Initializing routing module');

  const app = express();

  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cors());
  app.use(helmet());

  const router = express.Router({mergeParams: true});

  app.use(router);

  app.use('/v1/status', StatusRoute);

  log.info(`Starting tempea backend on port ${EXPRESS_PORT}`);
  app.listen(EXPRESS_PORT, ()=> {
    log.info(`tempea backend listening on port ${EXPRESS_PORT}`);
  });
}());
