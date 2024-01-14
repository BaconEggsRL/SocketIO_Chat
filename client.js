/* client.js -- clientside socket.io code */

//////////////////////////////////////////

// html
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const typing = document.getElementById('typing');

// is_typing
var typing_timeout;
const typing_timeout_time = 2000;
var is_typing = false;

// init
let username;
let words;
const socket = io();
socket.on("init", async function(users, server_words) {

    console.log("init");

    // list of users
    usr = ""
    if (users.length > 0) {
        usr = "Users currently online: \n"
        for (let user of users)  {
            usr = usr.concat(" - '", user.name, "'\n")
        }
        usr = usr.concat("\n")
    } else {
        usr = "No other users are currently online. \n\n"
    }
    console.log(usr)

    // word list
    words = new Set(server_words)
    
    console.log('word check below:')
    //console.log(words)
    console.log(words.has("a"))



    ///////////////////////////////////////////////////////
    
    // loop prompt until we get a valid name
    let pmsg = "Please enter a unique username:\n(Usernames can be any valid string under 26 characters.)\n(Hit 'Cancel' to be assigned a random username.)\n"
    let err_msg = ""


    // ENTER LOOP
    looping = true
    err_msg = ""
    myLoop:
    while(looping) {
        // get temp name
        temp_name = prompt(usr + err_msg + pmsg, "");
        if (temp_name === null) {
            temp_name = 'guest-' + socket.id
        }
        console.log('temp_name = ' + temp_name);

        // check if valid
        try {
            const response = await socket.timeout(5000).emitWithAck('is_valid', temp_name);
            console.log('is_valid = ' + response.status); // is_valid
            console.log('err_msg = ' + response.message); // err msg
            looping = !response.status
            err_msg = response.message
        } catch (e) {
            // the server did not acknowledge the event in the given delay
            throw "APATT ERROR: No response."
        }

        // break
        if (!looping) {
            break;
        }
    }
    // EXIT LOOP

    // if valid, set username = temp_name
    username = temp_name;

    // get message history
    try {
        const response = await socket.timeout(5000).emitWithAck('get_history');
        console.log('history = ' + response.history);
        for (let data of response.history)  {
            console.log(data.username + ": " + data.message)
            addMessage(data.username + ": " + data.message);
        }
    } catch (e) {
        // the server did not acknowledge the event in the given delay
        throw "APATT ERROR: No response."
    }

    // show join message
    addMessage("You have joined the chat as '" + username  + "'.");
    socket.emit("user_join", username);

});




socket.on("user_join", function(data) {
    addMessage(data + " just joined the chat!");
});

socket.on("user_leave", function(data) {
    addMessage(data + " has left the chat.");
});

socket.on("chat_message", function(data) {
    addMessage(data.username + ": " + data.message);
});

socket.on('user_typing', function(data){
    if (data.typing) {
        typing.innerHTML = '<p><em>' + data.username + ' is typing...</em></p>';
    } else {
        typing.innerHTML = ''
    }
});

/* Check if user is typing */
input.addEventListener('keyup', function() {
    if (input.value) {
        /* Only emit event if user was not typing before. */
        if (!is_typing) {

            console.log(username + " is typing")
            is_typing = true
            socket.emit('user_typing', {
                username: username,
                typing: true,
            });

            clearTimeout(typing_timeout)
            typing_timeout = setTimeout(timeoutFunction, typing_timeout_time)
        }
        
    }
})

/* Check if submit message and send to server */
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {

        // check if valid word
        //console.log(words)
        console.log("'"+input.value+"' is valid?: " + words.has(input.value))

        addMessage(username + ": " + input.value);
        socket.emit("chat_message", {
            username: username,
            message: input.value,
        });
        socket.emit('user_typing', {
            username: username,
            typing: false,
        });
        input.value = '';
    }
});

/* Generic chat_message function */
function addMessage(message) {
    const li = document.createElement("li");
    li.innerHTML = message;
    messages.appendChild(li);
    window.scrollTo(0, document.body.scrollHeight);
}

/* User typing timeout */
function timeoutFunction() {
    console.log(username + " stopped typing")
    is_typing = false
    socket.emit('user_typing', {
        username: username,
        typing: false,
    });
}