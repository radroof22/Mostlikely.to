var store = {
    state : {
        Username: "",
        RoomNumber: null,
        Socket: null,
        FinalRoster: null,
        currentQuestion: null,
        winningUser: null,
        waitTime: 3000,
        finalGameResults: [],
    },
    setSocket(socketInstance){
        this.state.Socket = socketInstance
    },
    setUsername(newName){
        this.state.Username = newName
    },
    setRoomNumber(newNumber){
        this.state.RoomNumber = newNumber
    },
    setFinalRoster(roster){
        this.state.FinalRoster = roster
    },
    setQuestion(question){
        this.state.currentQuestion = question
    },
    setWinningUser(user){
        this.state.winningUser = user;
    },
    setFinalGameResults(results){
        this.state.finalGameResults = results;
    },
}

function isAlphanumeric( str ) {
    return /^[0-9a-zA-Z]+$/.test(str);
}
function isText(str){
    return str.trim().length > 0;
}

Vue.component("join-lobby", {
    template: `
    <div id="main" class="jumbotron jumbotron-fluid">
        <div class="container">
            <h1 class="display-4">Mostlikely.to</h1>
            <p class="lead"> Join your friends and get a lobby to play a game and understand what they think about you! One person should enter without a digital code to create a lobby, and the rest should join that persons lobby using their code.
            <hr class="my-4">
            <form @submit.prevent="newServerRequest">
                <div class="form-group">
                    <label for="usernameEntry">Username </label>
                    <input class="form-control" id="usernameEntry" v-model="username" placeholder="Enter Username" />
                    <small class="form-text text-muted">This will be the name that everyone will see during the game. It also must contain at least one alphanumeric character.</small>
                </div>
                <div class="form-group">
                    <label for="codeEntry">Code </label>
                    <input id="codeEntry" class="form-control" v-model="roomNumber" placeholder="Enter Code" type="number" />
                    <small class="form-text text-muted">The code will be 5 digits long. If you are creating a lobby, leave this section blank and you can share your lobby's code on the next page.</small>
                </div>
                
                
                <button type="submit">
                    <div v-if="roomNumber == null || roomNumber == '' ">
                        Create Server
                    </div>
                    <div v-else>
                        Join Server
                    </div>
                </button>
            </form>
        </div>
    </div>
    `,

    data: function (){
        return {
            roomNumber: null,
            username: "",
            invalidCode:false,
            
            newServerRequest: function(){
                this.invalidCode = false;
                if (isAlphanumeric(this.username)){
                    store.state.Socket.emit("RequestRoom", {"code":this.roomNumber, "username": this.username});
                    store.state.Socket.on("Invalid Code", ()=>{
                        this.invalidCode = true;
                        alert("Invalid Code")
                        app.currentView = "join-lobby"
                    })
                    if (this.invalidCode == false){
                        // Returned official state that the user has created or joined new lobby
                        store.setUsername(this.username)                 
                        app.currentView = "wait-lobby"
                    }
                }
            }

        }
    },   
})

Vue.component("wait-lobby", {
    template:`
    <div class=" jumbotron-fluid">
        <div class="container">
            <h1 class="display-4">Lobby <strong>{{lobbyCode}}</strong></h1>
            <p class="lead">Make sure you ready up to have the game start. Once all of the users in the lobby ready up, the game will begin. If the lobby only has one person, it will require a second person to join and ready for the game to start</p>
            <button @click='readyUp'type="button" class="btn btn-primary">Ready Up</button>
            <hr class="my-4">
            <br/>
            <p v-show="roster.length < 2"><strong>Lobby Must Have More than 1 Participant</strong></p>
            <ul class="list-group">
                <li v-for="player in roster" class="list-group-item d-flex justify-content-between align-items-center">
                    {{player.username}} <div v-if="player['_ready']"> <span class="badge badge-primary badge-pill">Ready</span> </div>
                </li>
            </ul>
        </div>
    </div>
    `,
    data: function(){
        return {
            roster: [],
            lobbyCode: null,
            readyUp(){
                // Tell the Server that client is ready
                store.state.Socket.emit("ReadyUp", 
                    {"lobbyCode":store.state.RoomNumber, 
                    "username":store.state.Username})
            }
        }
    },
    mounted: function(){
        store.state.Socket.on("UpdatedLobbyRoster", (data) => {
            this.roster = data["roster"]
            // Update lobby code state 
            this.lobbyCode = data["lobbyCode"]
            store.setRoomNumber(this.lobbyCode)
        })
        // If Lobby is finished and everyone is ready
        store.state.Socket.on("FinalLobbyRoster", (data) => {
            store.setFinalRoster(data["roster"])
            app.currentView = "propose-questions"
        })
    },
})

Vue.component("propose-questions", {
    template:`
    <div class="jumbotron-fluid">
        <div class="container-fluid">
            <h1 class="display-4">Propose Questions</h1>
            <p class="lead">The questions you write will be the questions that others will answer in the game. Make sure the questions are typed correctly and make sure to press the submit button. Ensure that all of your questions have at least one character in them for them to be submitted</p>
            <hr class="my-4">
            <form @submit.prevent="proposeQuestions" v-show='proposing'>
                <div class="form-group">
                    <label for="firstQ">First Question </label>
                    <input class="form-control" id="firstQ" v-model="firstQuestion" placeholder="First Question" type="text"/>
                </div>
                <div class="form-group">
                    <label for="secondQ">Second Question</label>
                    <input id="secondQ" class="form-control" v-model="secondQuestion" placeholder="Second Question" type="text" />
                </div>
                
                
                <button type="submit" class="btn btn-lg btn-success">Submit Questions</button>
            </form>
            <div v-show="!proposing">
                <p>Please wait for the others to finish up with their questions</p>
            </div>
            <br/>
            <ul class="list-group">
                <li class="list-group-item" v-for="person in this.roster">{{person.username}}</li>
            </ul>
        </div>
    </div>
    `,
    data: function(){
        return {
            roster: store.state.FinalRoster,
            firstQuestion: "",
            secondQuestion:"",
            proposing: true,
            proposeQuestions(){
                console.log(isText(this.firstQuestion))
                console.log(isText(this.secondQuestion))
                if(isText(this.firstQuestion) && isText(this.secondQuestion)){
                    store.state.Socket.emit("ProposeQuestions", {"lobbyCode": store.state.RoomNumber, "firstQ":this.firstQuestion, "secondQ": this.secondQuestion})
                    this.proposing = false
                }
            }
        }
    },
    mounted: function(){
        store.state.Socket.on("SendQuestion", (data)=>{
            store.setQuestion(data["question"])
            app.currentView = "AnswerQuestion"
        })
    },
})

Vue.component("AnswerQuestion", {
    template: `
    <div class="jumbotron jumbotron-fluid">
        <div class="container-fluid">
            <h1 class="display-4">Question: "{{this.question}}"</h1>
            <p class="lead">Press one of the people's name to vote for who you think is most likely to do this.</p>
            <hr class="my-4">
            <ul class="list-group">
                <li class="list-group-item" v-for="person in roster" v-on:click="voteFor(person.username)"><span v-show="votedFor == person.username" class="badge badge-light">Chosen</span>{{person["username"]}}</li>
            </ul>
        </div>
    </div>
    `,
    data: function(){
        return {
            roster: store.state.FinalRoster,
            question: store.state.currentQuestion,
            votedFor: null,
            votingLocked: false,
        }
    },
    methods: {
        voteFor:function(person){
            this.votedFor = person
            console.log("Declaring vote")
            store.state.Socket.emit("DeclareVote", {"votedFor": person, "lobbyCode": store.state.RoomNumber})
        }
    },
    mounted: function(){
        store.state.Socket.on("SendWinner", (data) => {
            store.setWinningUser(data["winningUser"])
            app.currentView = "PresentResult"
        })
        
    }
})
Vue.component("PresentResult", {
    template: `
    <div class="jumbotron jumbotron-fluid">
        <div class="container-fluid">
            <h1 class="display-4"><strong>{{this.winner.username}}</strong> with <strong>{{this.winner.votes}}</strong></h1>
            <p class="lead">Winner of Question: "{{this.question}}"</p>
            
        </div>
    </div>
    `,
    data: function(){
        return {
            question: store.state.currentQuestion,
            winner: store.state.winningUser
        }
    },
    mounted: function(){
        if(this.winner["username"] == store.state.Username){
            // Let winner handle the requesting for another person
            setTimeout(() => {
                // Request a question
                store.state.Socket.emit("AnotherQuestion", {'lobbyCode': store.state.RoomNumber})
            }, store.state.waitTime);
        }
        store.state.Socket.on("SendQuestion", (data) => {
            store.setQuestion(data["question"])
            app.currentView = "AnswerQuestion";
        })
        store.state.Socket.on("GameFinished", (data) => {
            console.log("Game Finished")
            store.setFinalGameResults(data["results"])
            app.currentView = "GameFinished"
        })
    }
})

Vue.component("GameFinished", {
    template: `
    <div class="jumbotron jumbotron-fluid">
        <div class="container-fluid">
            <h1 class="heading"> Results </h1> 
            <hr/>
            <div class="card" style="width: 18rem;">
                <ol class="list-group list-group-flush">
                    <li class="list-group-item d-flex justify-content-between align-items-center" v-for="person in winners">
                        {{person.username}}
                        <span class="badge badge-success badge-pill">{{person.roundsWon}}</span>
                    </li>
                </ol>
            </div>
        </div>
    </div>
    <style>
    </style>
    `,
    data: function(){
        return {
            finalGame: store.state.finalGameResults,
            winners: (store.state.finalGameResults.sort((a, b) => {
                return a.roundsWon - b.roundsWon;
            })).reverse()
        }
    },
})




var app = new Vue({
    el: "#app",
    data: {
        message: "yoyo",
        currentView: "join-lobby"
        
    },
    methods: {
        // Functions to Handle Component Insertion
        lobbyJoin() {
            if (this.state == "join-lobby"){return true}
        },
        updateCurrentView (name){
            this.currentView = name
        }
    },
    created: function(){
        store.setSocket(io());
    },
});