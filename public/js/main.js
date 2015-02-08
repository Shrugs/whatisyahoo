

$(document).ready(function() {

    var answer = undefined;


    showGameboard();

    function showGameboard() {
        $('#view--gameboard').show();
        $('#view--question').hide();
        $('#view--buzzer').hide();
    }

    function showQuestions() {
        $('#view--gameboard').hide();
        $('#view--question').show();
        $('#view--buzzer').hide();

        $('.card__text').text(answer.answer);
        for (var k in answer.questions) {
            $('#' + k).text(answer.questions[k]);
        }
    }

    function showBuzzer(enabled) {
        $('#view--gameboard').hide();
        $('#view--question').hide();
        $('#view--buzzer').show();

        $('.card__text').text(answer.answer);

        if(enabled)
            $('.buzzer').removeClass('buzzer--disabled');
        else
            $('.buzzer').addClass('buzzer--disabled');
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

        showBuzzer(true);
    });

    $('.buzzer').on('click', function(e) {
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
        showBuzzer(false);
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