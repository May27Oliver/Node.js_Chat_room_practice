let socketio = require('socket.io');
let io;
let guestNumber = 1;
let nickNames = {};
let namesUsed = [];
let currentRoom = {};

exports.listen = function(server){//定義聊天室listen的函式
    io = socketio.listen(server);//啟動socket.io伺服器，讓他奠基於既有的HTTP伺服器上
    io.set('log level',1);

    io.sockets.on('connection',function(socket){
        guestNumber = assignGuestName(socket, guestNumber, nickNames,namesUsed);
        joinRoom(socket,'Lobby');//使用者連線時將之放到lobby聊天室

        handleMessageBroadcasting(socket,nickNames);//處理使用者訊息
        handleNameChangeAttempts(socket,nickNames,namesUsed);//暱稱改變
        handleRoomJoining(socket);//加入聊天室

        socket.on('rooms',function(){//提供使用者聊天室的清單
            socket.emit('rooms',io.sockets.manager.rooms);
        });

        handleClientDisconnection(socket,nickNames,namesUsed);//定義使用者斷線時的清理邏輯
    });
};

//指定訪客暱稱
function assignGuestName(socket,guestNumber,nickNames,namesUsed){ 
    let name = 'Guest' + guestNumber; //產生新的訪客暱稱
    nickNames[socket.id] = name;       //將訪客暱稱與伺服器ID連接起來
    socket.emit('nameResult',{          //讓使用者知道他的訪客暱稱
        success:true,
        name:name
    });
    namesUsed.push(name);               //指名這個訪客暱稱目前被使用中
    return guestNumber + 1;             //遞增用來產生訪客暱稱的計數器
}

//加入聊天室
function joinRoom(socket, room){
    socket.join(room);                                          //讓使用者加進聊天室
    currentRoom[socket.id] = room;                              //註名使用者正在這個聊天室內
    socket.emit('joinResult',{room:room});                      //讓使用者知道他在新的聊天室裡
    socket.broadcast.to(room).emit('message',{                  //讓聊天室裡的其他使用者知道使用者已加入
        text:nickNames[socket.id] + 'has joined' + room + '.'
    });

    let usersInRoom = io.sockets.clients(room);                 //判斷有哪些人跟使用者同處相同的聊天室
    if( usersInRoom.length > 1){                                //假如有其他使用者，總結一下有哪些使用者
        let usersInRoomSummary = 'Users currently in ' + room +': ';
        for( let index in usersInRoom){
            let userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id){
                if(index > 0){
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message',{text:usersInRoomSummary});       //告訴使用者還有哪些人處於相同的聊天室
    }
}

//處理暱稱變更的請求邏輯
function handleNameChangeAttempts(socket, nickNames, namesUsed){
    socket.on('nameAttempt',function(name){                     //增加nameAttempt事件的偵聽器
        if(name.indexOf('Guest') == 0){                         //新的使用者暱稱不允許用guest開頭
            socket.emit('nameResult',{
                success:false,
                message:'Names cannot begin with "Guset".'
            });
        }else{
            if(namesUsed.indexOf(name) == -1){                  //假如暱稱尚未被註冊，則註冊之。
                let previousName = nickNames[socket.id];
                let previousNameIndex = namesIsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];            //移除先前的暱稱讓其他使用者可以使用
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
            }else{
                socket.emit('nameResult',{                       //假如暱稱已經被註冊就傳送錯誤給使用者
                    success:false,
                    message:'That name is already in use.'
                })
            }
        }
    })
}

//傳送聊天室訊息
function handleMessageBroadcasting(socket){
    socket.on('message',function(message){
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id]+': ' + message.text
        });
    });
}

/*
Web browser A --> Node server     message事件由客戶端送出，附帶JSON資料
{
    room:"Lobby",
    text:"Hi all!"
}

Web browser B   <-------- Node Server    message事件由伺服器端送出，附帶JSON資料
Web browser C   <-----|
Web browser D   <-----|
*/

//建立聊天室
function handleRoomJoining(socket){
    socket.on('join',function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    });
}

//處理使用者斷線
function handleClientDisconnection(socket){
    socket.on('disconnect',function(){
        let nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    }) 
}
