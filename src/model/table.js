'use strict';

class Table {
  constructor(teams) {
    this.teams = teams;
    this.teams.sort();
    this.lastRound = 0;

    this.tablePerRound = [{}];
    for (const team of teams) {
      this.tablePerRound[0][team] = {
        position: 1,
        movement: 0,
        lastPosition: 1,
        code: team,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesDrawn: 0,
        gamesLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalsDifference: 0,
        points: 0
      };
    }
  }

  getTableAfterRound(roundNr) {
    return 'bar';
  }

  get latestTable() {
    return this.tablePerRound[this.lastRound];
  }

  addMatch(match) {
    const homeTeam = match.team1.code;
    const awayTeam = match.team2.code;
    console.log('asd');
  }
}

module.exports = Table;
