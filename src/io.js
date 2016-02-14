'use strict';

const json2csv = require('json2csv');
const fs = require('fs');
const co = require('co');
const util = require('util');
const logger = require('winston');
const appRootDir = require('app-root-dir').get();

const GithubProxy = require('./provider/github');
const TransfermarktProxy = require('./provider/transfermarkt-de');
const LocalFileLoader = require('./provider/local');

logger.cli();

class IO {
  constructor(config) {
    this.config = config;
    this.clubMeta = {};
    this.clubs = [];
    this.rounds = [];
  }

  loadFromLocalFile() {
    return co(function*() {
      this.clubs = yield LocalFileLoader.getClubsAsJson(this.seasonAsString, this.config.country, this.config.league);
      this.rounds = yield LocalFileLoader.getResultsAsJson(this.seasonAsString, this.config.country, this.config.league);

      return this;
    }.bind(this));
  }

  loadClubMeta() {
    const self = this;

    return co(function*() {
      for (const clubCode of self.clubCodes) {
        self.clubMeta[clubCode] = TransfermarktProxy.getTeamInfo(clubCode, self.fourDigitSeasonStartYear);
      }
      yield self.clubMeta;

      /* WTF, why is this needed? Am I dumb? */
      for (const clubCode in self.clubMeta) {
        yield self.clubMeta[clubCode].then(function(data) {
          self.clubMeta[clubCode] = data;
        });
      }
      /* WTF End */

      return;
    });
  }

  loadClubAndMatchData(fromLocal) {
    logger.info('Source for match results: %s', fromLocal ? 'Local File' : 'github.com/openfootball/football.json');
    return fromLocal ? this.loadFromLocalFile() : this.loadFromGithub();
  }

  loadFromGithub() {
    return co(function*() {
      this.clubs = yield GithubProxy.getClubsAsJson(this.seasonAsString, this.config.country, this.config.league);
      this.rounds = yield GithubProxy.getResultsAsJson(this.seasonAsString, this.config.country, this.config.league);

      return this;
    }.bind(this));
  }

  get fourDigitSeasonStartYear() {
    return `20${this.config.year}`;
  }

  get clubCodes() {
    return this.clubs.map(club => club.code);
  }

  get seasonAsString() {
    const fourDigitSeasonStart = 2000 + this.config.year;
    const twoDigitSeasonEnd = parseInt(this.config.year, 10) + 1;
    return `${fourDigitSeasonStart}-${twoDigitSeasonEnd}`;
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
    json2csv({ data }, (err, csv) => {
      if (err) {
        throw err;
      }

      const fileName = self.outputFileName;
      const file = `${appRootDir}/output/${fileName}`;

      fs.writeFileSync(file, csv);

      const allData = Object.keys(data);
      logger.info('Processed %s matches for %s', allData.length, self.yearSeasonLeague);
      const columnNames = Object.keys(data[0]);

      logger.info('Calculated %s attributes:\n %s', columnNames.length, columnNames);
      logger.info('CSV with %s data points created and saved to %s', allData.length * columnNames.length, fileName);
    });
  }
}

module.exports = IO;
