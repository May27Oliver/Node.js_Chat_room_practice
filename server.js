let http = require('http'); //http模組提供http伺服器與客戶端功能性
let fs = require('fs'); //fs模組提供檔案系統相關功能
let path = require('path'); //path模組提供檔案系統路徑相關功能
let mime = require('mime'); //mime模組讓你根據檔案副檔名取得MIME類型
let url = require('url');
let cache = {}; //cache是快取檔案內容的地方

//建立請求不存在時送出404錯誤的函式
function send404(res){
    res.writeHead(404,{'Content-Type':'text/plain'});
    res.write('Error 404: resource not found.');
    res.end();//停止伺服器等待的狀態
}

//這個函式提供檔案資料，先寫出http標頭，再傳送檔案內容
function sendFile(res,fpath,fcontent){
    res.writeHead(
        200,
        {'content-type':mime.lookup(path.basename(fpath))}
    );
    res.end(fcontent);
}

//提供靜態檔案如html
function serveStatic(res,cache,absPath){//檢查檔案室否被快取在記憶體中
    if(cache[absPath]){
        sendFile(res,absPath,cache[absPath]);//從記憶體提供檔案
    }else{
        fs.exists(absPath,function(exists){//檢查檔案是否存在
            if(exists){
                fs.readFile(absPath,function(err,data){//從硬碟讀取檔案
                    if(err){
                        send404(res);
                    }else{
                        cache[absPath] = data;
                        sendFile(res,absPath,data);//提供從硬碟讀到的檔案
                    }
                });
            }else{
                send404(res);//傳送404 not found
            }
        })
    }
}

//建立Http伺服器
let server = http.createServer(function(request,res){//建立HTTP伺服器，使用callback函式定義每個請求產生的行為
    let filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';
    }else{
        console.log('request.url',request.url);
        filePath = 'public' + request.url;
    }
    let absPath = './' + filePath;
    serveStatic(res,cache,absPath);
})

server.listen(3000,function(){
    console.log('Server listening on port 3000.');
})

// 建立socket.io伺服器
let chatServer = require('./lib/chat_server');
//從lib資料夾中載入chat_server模組，chat_server模組是基於socket.io之伺服器聊天功能的Node模組載入功能。
chatServer.listen(server);
//啟動socket.io伺服器功能。