var _ = require('lodash');
var io;


// CONSTS
var ANSWER_TIMER = 1500000; // 15 seconds to answer

// GAME STATE
var users = [];
var board = require('./board');

var STATE_DEFAULT = 0; // waiting for someone to choose an answer
var STATE_QUESTIONING = 1; // an answer has been chosen but nobody has buzzed in
var STATE_BUZZED_IN = 2; // a player has buzzed in and has not yet answered

var state = {
    state: STATE_DEFAULT,
    // args is unique to each state
    // default state will have which user's turn it is (first user as default)
    // buzzed in state will have the currentUser arg
    // etc
};


var buzzerTimeout;

function pointValue(i) {
    return 200 + i*200;
}

var User = function(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.canQuestion = true;
    this.points = 0;
}

User.prototype.addPoints = function(points) {
    this.points += points;
};

User.prototype.json = function() {
    return {
        id: this.id,
        points: this.points,
        canQuestion: this.canQuestion
    }
};

function resetToState(newState) {
    // resets to state
    // emits state to users
    if (newState === STATE_DEFAULT) {
        state.state = STATE_DEFAULT;

    } else if (newState === STATE_QUESTIONING) {
        state.state = STATE_QUESTIONING
        state.currentUser = undefined;

    } else if (newState === STATE_BUZZED_IN) {
        state.state = STATE_BUZZED_IN;
    }
}

module.exports = {
    globals: function(_io) {
        io = _io;
    },

    newUser: function(socket) {
        users.push(new User(socket));
        if (state.currentUser === undefined) {
            state.currentUser = users[0];
        }
        this.sendUsers();
    },
    removeUser: function(socket) {
        users = _.without(users, _.findWhere(users, {id: socket.id}));
        this.sendUsers();
    },
    sendUsers: function() {
        io.emit('users', _.map(users, function(user) {
            return user.id
        }));
    },
    on: {
        chooseAnswer: function(col, i) {
            // needs the column and index of question
            var answer = board[col][i];
            if (answer.wasSolved) {
                // answer was already solved, sent back error event
                // ideally this will never happen though
                return;
            }
            // returns back the information for that answer
            state.state = STATE_QUESTIONING;
            state.answer = answer;
            state.currentAnswer = {
                col: col,
                i: i
            };
            return {
                state: state.state,
                answer: state.answer,
                currentAnswer: state.currentAnswer
            };
        },
        buzzIn: function(userId) {
            var user = _.findWhere(users, {id: userId})

            var peopleAllowedToBuzzIn = 0;
            _.each(users, function(user) {
                peopleAllowedToBuzzIn += user.canQuestion ? 1 : 0;
            });

            isAllowedToBuzz = true;
            isAllowedToBuzz = !(state.state === STATE_BUZZED_IN || !user.canQuestion);
            if (!isAllowedToBuzz) {
                // if nobody can buzz in, allow anyone
                isAllowedToBuzz = peopleAllowedToBuzzIn === 0;
            }

            if (!isAllowedToBuzz) {
                // if someone has already buzzed in, don't do anything
                // or they already tried to answer
                io.to(user.socket.id).emit('buzz in', {
                    allowed: false
                });
                return {
                    state: state.state,
                    currentUser: state.currentUser.json()
                };
            }

            // someone buzzed in
            state.state = STATE_BUZZED_IN;
            state.currentUser = user;
            // start the timeout
            buzzerTimeout = setTimeout(function() {
                // tell that userId they're wrong
                io.to(state.currentUser.socket.id).emit('wrong answer');
                user.canQuestion = false;
                // reset the state
                resetToState(STATE_QUESTIONING);

            }, ANSWER_TIMER);

            // tell that user they can answer
            io.to(state.currentUser.socket.id).emit('buzz in', {
                allowed: true
            });

            // returns the user who has buzzed in
            return {
                state: state.state,
                currentUser: state.currentUser.json()
            };

        },
        chooseQuestion: function(key) {

            // clear the buzzer timer
            clearTimeout(buzzerTimeout);

            // needs the key ([A B C D]) of the question
            // returns whether or not it was correct
            var col = state.currentAnswer.col;
            var i = state.currentAnswer.i;
            // if the chosen key was the wrong answer
            if (key !== board[col][i].correct) {
                // send back the 'wrong answer' event
                // and set the state back to questioning
                state.state = STATE_QUESTIONING;
                io.to(state.currentUser.socket.id).emit('wrong answer');
                state.currentUser.canQuestion = false;
                return {
                    state: state.state,
                    currentUser: state.currentUser.json()
                };
            }

            // answer was correct
            // mark it was solved, give the points to the user
            board[col][i].wasSolved = true;
            state.currentUser.addPoints(pointValue(i));
            io.to(state.currentUser.socket.id).emit('correct answer', {
                points: state.currentUser.points
            });

            _.each(users, function(user) {
                user.canQuestion = true;
            });

            resetToState(STATE_DEFAULT);
            return {
                state: state.state,
                currentUser: state.currentUser.json()
            };
        }
    }
}