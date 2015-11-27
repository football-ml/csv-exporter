'use strict';

const json2csv = require('json2csv');
const fs = require('fs');
const util = require('util');
const logger = require('winston');
const superagent = require('superagent');
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

  loadData(fromLocal, cb) {
    logger.info('Using source: %s', fromLocal ? 'Local File' : 'GitHub');
    if (fromLocal) {
      this.loadFromLocalFile(cb);
    } else {
      this.loadFromGithub(cb);
    }
  }

  loadFromGithub(cb) {
    const self = this;
    const clubsTemplate = 'https://raw.githubusercontent.com/openfootball/football.json/master/%s/%s.%s.clubs.json';
    const resultsTemplate = 'https://raw.githubusercontent.com/openfootball/football.json/master/%s/%s.%s.json';

    const clubsURL = util.format(clubsTemplate, this.seasonAsString, this.config.country, this.config.league);
    const resultsURL = util.format(resultsTemplate, this.seasonAsString, this.config.country, this.config.league);

    superagent
      .get(clubsURL)
      .end(function(err, res) {
        if (err) {
          return cb(err);
        }

        self.clubs = JSON.parse(res.text).clubs;
        superagent
          .get(resultsURL)
          .end(function(err2, res2) {
            if (err2) {
              return cb(err2);
            }

            self.rounds = JSON.parse(res2.text).rounds;
            cb(self);
          });
      });
  }

  get clubCodes() {
    return this.clubs.map(club => club.code);
  }

  get seasonAsString() {
    return 2000 + this.config.year + '-' + (parseInt(this.config.year, 10) + 1);
  }

  get yearSeasonLeague() {
    const template = '%s_%s_%s';
    return util.format(template, this.seasonAsString, this.config.country, this.config.league);
  }

  get outputFileName() {
    const filename = '%s_%s_%s_%s.csv';

    return util.format(filename, Date.now(), this.seasonAsString, this.config.country, this.config.league);
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
      logger.info('Analyzed %s', self.yearSeasonLeague);
      logger.info('CSV created and saved to', file);
    });
  }
}

module.exports = IO;
