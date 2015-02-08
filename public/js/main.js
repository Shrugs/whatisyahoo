

$(document).ready(function() {

    var answer = undefined;


    showGameboard();

    function showGameboard() {
        $('#view--gameboard').show();
        $('#question-view').hide();
        $('#buzzer-view').hide();
    }

    function showQuestions() {
        $('#view--gameboard').hide();
        $('#question-view').show();
        $('#buzzer-view').hide();

        $('.card__text').text(answer.answer);
        for (var k in answer.questions) {
            $('#' + k).text(answer.questions[k]);
        }
    }

    function showBuzzer() {
        $('#view--gameboard').hide();
        $('#question-view').hide();
        $('#buzzer-view').show();
    }


    var socket = io();

    socket.on('choose answer', function(state) {

        answer = state.answer;
        console.log(state);
        // someone chose an answer, so flip that card over
        var col = state.currentAnswer.col;
        var i = state.currentAnswer.i;

        var thisAnswer = $('.gameboard__cell[data-col="' + col + '"]')[i];
        $(thisAnswer).addClass('gameboard__cell--empty').html('');

        showBuzzer();
    });

    $('#buzzer').on('click', function(e) {
        socket.emit('buzz in');
        e.preventDefault();
    });


    $('.question__confirm').on('click', function() {
        var that = $(this);
        socket.emit('choose question', {
            key: that.attr('id')
        });
    });

    socket.on('buzz in', function(data) {
        if (data.allowed) {
            showQuestions();
        }
    });
    socket.on('choose question', function(state) {
        if (state.state === 0) {
            showGameboard();
        }
    });
    socket.on('wrong answer', function(data) {
        // wrong answer, go back to buzzer
        showBuzzer();
    });
    socket.on('correct answer', function(data) {
        showGameboard();
    });
    socket.on('buzzed in', function(data) {
        console.log(data);
    });

    $('.gameboard__button').on('click', function() {
        var col = $(this).parent().data('col');
        var i = $('.answers-row').index($(this).parent().parent());

        // @TODO send the choose answer event to server
        socket.emit('choose answer', {
            col: col,
            i: i
        });

    });

});