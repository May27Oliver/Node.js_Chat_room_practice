/*
1.將使用者的訊息以及暱稱/聊天室的變更請求傳送給伺服器
2.顯示其他使用者的訊息以及有效聊天室的清單
*/
let Chat = function(socket){
    this.socket = socket;
}

//傳送聊天訊息
Chat.prototype.sendMessage = function(room, text){
    let message = {
        room:room,
        text:text
    }
    this.socket.emit('message',message);
}

//變更聊天室
Chat.prototype.changeRoom = function(room){
    this.socket.emit('join',{
        newRoom:room
    });
}

//處理聊天命令
Chat.prototype.processCommand = function(command){
    let words = command.split(' ');
    var command = words[0]
        .substring(1,words[0].length)
        .toLowerCase();
    let message = false;

    switch(command){
        case 'join':
            words.shift();
            let room = words.join(' ');
            this.changeRoom(room);//處理聊天室變更建立
            break;
        case 'nick':
            words.shift();
            let name = words.join(' ');
            this.socket.emit('nameAttempt',name);//處理暱稱變更的企圖
            break;
        default:
            message = "Unrecognized command.";  //假如命令無法辨識，就傳錯誤訊息
            break;
    }
    return message;
}