'use strict';

const json2csv = require('json2csv');
const fs = require('fs');
const util = require('util');
const logger = require('winston');
const appRootDir = require('app-root-dir').get();

logger.cli();

class IO {
  constructor(config) {
    this.config = config;
    this.clubs = [];
    this.rounds = [];
  }

  loadFromLocalFile(cb) {
    const clubs = util.format('%s/%s.%s.clubs.json', this.seasonAsString, this.config.country, this.config.league);
    const results = util.format('%s/%s.%s.json', this.seasonAsString, this.config.country, this.config.league);

    this.clubs = require(appRootDir + '/' + clubs).clubs;
    this.rounds = require(appRootDir + '/' + results).rounds;

    return cb(this);
  }

  get clubCodes() {
    return this.clubs.map(club => club.code);
  }

  get seasonAsString() {
    return 2000 + this.config.year + '-' + (parseInt(this.config.year, 10) + 1);
  }

  get outputFileName() {
    const season = this.seasonAsString;
    const filename = '%s_%s_%s_%s.csv';

    return util.format(filename, Date.now(), season, this.config.country, this.config.league);
  }

  writeToDiskAsCSV(data) {
    const self = this;
    json2csv({ data: data }, function(err, csv) {
      if (err) {
        throw err;
      }

      const fileName = self.outputFileName;
      const file = appRootDir + '/output/' + fileName;

      fs.writeFileSync(file, csv);
      logger.info('Analyzed %s', fileName);
      logger.info('CSV created and saved to', file);
    });
  }
}

module.exports = IO;
