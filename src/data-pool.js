'use strict';

const json2csv = require('json2csv');
const fs = require('fs');
const util = require('util');
const logger = require('winston');

const appRootDir = require('app-root-dir').get();

const GithubProxy = require('./provider/github');
const TransfermarktProxy = require('./provider/transfermarkt-de');
const LocalFileLoader = require('./provider/local');

logger.cli();

class DataPool {
  constructor(config) {
    this.config = config;
    this.clubs = [];
    this.rounds = [];
    this.timeOfInstantiation = Date.now();
  }

  loadFromLocalFile() {
    return {
      clubs: LocalFileLoader.getClubsAsJson(this.seasonAsString, this.config.country, this.config.league),
      rounds: LocalFileLoader.getResultsAsJson(this.seasonAsString, this.config.country, this.config.league)
    };
  }

  loadClubMeta(clubCodes) {
    const self = this;

    const clubMeta = {};
    for (const clubCode of clubCodes) {
      clubMeta[clubCode] = TransfermarktProxy.getTeamInfo(clubCode, self.fourDigitSeasonStartYear);
    }

    return clubMeta;
  }

  loadRoundMeta(start, end) {
    const allMatchdays = {};
    for (let i = start; i <= end; i++) {
      allMatchdays[i] = TransfermarktProxy.getMatchdayInfo(this.config.country, this.config.league, this.fourDigitSeasonStartYear, i);
    }

    return allMatchdays;
  }

  loadClubAndMatchData(fromLocal) {
    return fromLocal ? this.loadFromLocalFile() : this.loadFromGithub();
  }

  loadFromGithub() {
    return {
      clubs: GithubProxy.getClubsAsJson(this.seasonAsString, this.config.country, this.config.league),
      rounds: GithubProxy.getResultsAsJson(this.seasonAsString, this.config.country, this.config.league)
    };
  }

  get fourDigitSeasonStartYear() {
    return `20${this.config.year}`;
  }

  static toClubCodes(clubs) {
    return clubs.map(club => club.code);
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

  outputFileName(suffix) {
    const filename = '%s_%s_%s_%s_%s.csv';

    return util.format(filename, this.timeOfInstantiation, this.seasonAsString, this.config.country, this.config.league, suffix);
  }

  writeTrainingDataToDiskAsCSV(data) {


    return this._writeToDiskAsCSV(data, 'train');
  }

  writeTestDataToDiskAsCSV(data) {
    return this._writeToDiskAsCSV(data, 'test');
  }

  _writeToDiskAsCSV(data, suffix) {
    return new Promise((resolve, reject) => {
      json2csv({ data }, (err, csv) => {
        if (err) {
          reject(err);
        }

        const fileName = this.outputFileName(suffix);
        const file = `${appRootDir}/output/${fileName}`;

        fs.writeFileSync(file, csv);


        resolve(fileName);
      });
    });
  }
}

module.exports = DataPool;
