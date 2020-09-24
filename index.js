// 入口文件
var http = require("http");
var url = require("url");
var fs = require("fs");
var querystring = require("querystring");
// 引入cookie
var cookie = require("cookie");

// 引入mysql模块
var mysql = require("mysql");
// 创建一个链接来得到一个对象
var connection = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'zlotyzz',
    database:'ajaxdemo'
});
// 链接数据库
connection.connect(function(err){
    if(err){
        console.error('error connecting:'+ err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});
var app = http.createServer(function(req,res){
    
    var url_obj = url.parse(req.url);
    
    //再通过观察发现，每次判断请求的路由和读取的文件的关系可得,可以通过对应关系来去掉if判断
    // 每次调用render方法都是根据请求的url_obj.pathname。有一个pathname出现就会执行一次
    // 1. "/"   url_pathname = '/'   render("./template/"+"/",res)
    // 2. "/login.html"   url_pathname = '/login.html'   render("./template"+"/login.html",res)
    // 3. "/css/index.css"   url_pathname = '/css/index.css'   render("./template"+"/css/index.css",res)

    //单独对请求的'/'，响应'./template/index.html'，单独渲染首页
    if(url_obj.pathname === '/'){
        render('./template/index.html',res);
        // 直接返回不会去执行后面的代码
        return;
    }

    // 处理注册逻辑
    if(url_obj.pathname === '/register' && req.method === 'POST'){
        // 接收前台用户发送过来的数据
        var user_info = '';
        req.on('data',function(chunk){
            user_info += chunk;
        });
        req.on('end',function(err){
            if(!err){
                // console.log(user_info);
                // 1.如果输入为空
                var user_obj = querystring.parse(user_info);
                res.setHeader('content-type','text/html;charset=utf-8');
                if(user_obj.username === '' || user_obj.password === ''){
                    res.write('{"status":1,"message":"用户名或密码不能为空!"}','utf-8');
                    res.end();
                    return;
                }
                //   2.如果密码和确认密码不相等
                if(user_obj.password !== user_obj.repassword){
                    res.write('{"status":1,"message":"两次密码输入不一样!"}','utf-8');
                    res.end();
                    return;
                }
                // 把信息写入到数据库
                var sql = 'INSERT INTO admin(username,password) VALUE("'+user_obj.username+'","'+user_obj.password+'")';
                connection.query(sql,function(error,result){
                    // 如果没有错误，并且result的长度不为0返回注册成功
                    // console.log("error:" ,error);
                    // console.log("result",result);
                    // 如果没有出错，error为null---false，result为一个数组
                    // 如果出错，error中存有东西
                    if(!error && result && result.length !== 0){
                        res.write('{"status":0,"message":"恭喜你，注册成功!"}','utf-8');
                        res.end();
                        return;
                    }
                })
                
            }

        });
        return;
    }

    // 处理登录的逻辑
    if(url_obj.pathname === '/login' && req.method === 'POST'){
        // 接收前端发过来的数据
        var user_info = '';
        req.on('data',function(chunk){
            user_info += chunk;
        });
        req.on('end',function(err){
            res.setHeader('content-type','text/html;charset=utf-8');
            if(!err){
                var user_obj = querystring.parse(user_info);

                // 把前端传来的username和password拿到数据库中和已有的数据作比对
                var sql = "SELECT * FROM admin WHERE username='"+user_obj.username+"' AND password='"+user_obj.password+"'";
                connection.query(sql,function(error,result){
                    // 当查询到数据库总该账户则result返回的是一有内容的数组可以登录，反之为一空数组查询不出数据，不能登录
                    if(!error && result && result.length !== 0){
                        // 在返回成功信息的时候需要设置一个cookie，带回到浏览器
                        res.setHeader('Set-Cookie',cookie.serialize('isLogin','true'));


                        res.write('{"status":0,"message":"登录成功"}','utf-8');
                        res.end();
                    }else{
                        res.write('{"status":1,"message":"用户名或密码错误"}','utf-8');
                        res.end();
                    }

                })
            }
        })
        return;
    }
    
    // 返回用户表的表格数据
    if(url_obj.pathname === '/list' && req.method === 'GET'){

        res.setHeader('content-type','text/html;charset=utf-8');
        // 连接数据库，并从数据库中读取数据
        var sql = "SELECT * FROM user ";
        connection.query(sql,function(error,result){
            // 给result为一数组数组中有n对象。需要经result中数据转变成json字符串响应回去
            if(!error && result && result.length !== 0){
                var arrstr = JSON.stringify(result);
                // console.log(arrstr);
                res.write('{"status":0,"data":'+arrstr+'}','utf-8');
                res.end();
            }else{
                // res.write(,'utf-8');
                // res.end();
            }
        });
    }

    // 添加用户信息
    if(url_obj.pathname === '/adduser' && req.method === 'POST'){
    // 接收前端发送过来的数据,并将数据传输到数据库中
        var user_info = '';
        req.on('data',function(chunk){
            user_info += chunk;
        });
        req.on('end',function(err){
            if(!err){
                res.setHeader('content-type','text/html;charset=utf-8');
                // 将查询字符串转变成对象
                var user_obj = querystring.parse(user_info);
                // 将数据发给数据库
                var sql = 'INSERT INTO user VALUE('+null+',"'+user_obj.username+'","'+user_obj.email+'","'+user_obj.phone+'","'+user_obj.qq+'")';
                connection.query(sql,function(error,result){
                    if(!error && result && result.length !== 0){
                        res.write('{"status":0,"message":"添加成功"}','utf-8');
                        res.end();
                        return;
                    }else{
                        res.write('{"status":1,"message":"添加失败!"}','utf-8');
                        res.end();
                        return;
                    }
                })
            }
        })
        return;
    }

    // 编辑用户信息
    if(url_obj.pathname === '/update' && req.method === 'POST'){

        res.setHeader('content-type','text/html;charset=utf-8');
        // res.write('{"status":0,"data":"修改成功"}','utf-8');
        // res.end();
        //1. 接收数据
        var user_info = '';
        req.on('data',function(chunk){
            user_info += chunk; 
        });
        req.on('end',function(err){
            if(!err){
                // 更新数据
                var user_obj = querystring.parse(user_info);
                var sql = 'UPDATE user SET username="'+user_obj.username+'",email="'+user_obj.email+'",phone="'+user_obj.phone+'",qq="'+user_obj.qq+'" WHERE id='+Number(user_obj.id);
                console.log(sql);
                connection.query(sql,function(error,result){
                    if(!error && result && result.length !== 0){
                        res.write('{"status":0,"message":"编辑成功"}','utf-8');
                        res.end();
                    }else{
                        res.write('{"status":1,"message":"编辑错误啦"}','utf-8');
                        res.end();
                    }
                })

            }
        })
        return;
    }

    // 删除用户
    if(url_obj.pathname === '/delete'&& req.method === 'POST'){
        // 1.接受id
        user_info = '';
        res.setHeader('content-type','text/html;charset=utf-8');
        req.on('data',function(chunk){
            user_info += chunk;
        });
        req.on('end',function(err){
            if(!err){
                var user_obj = querystring.parse(user_info);
                var sql='DELETE FROM user WHERE id='+Number(user_obj.id);
                connection.query(sql,function(error,result){
                    if(!error && result && result.length !== 0){
                        res.write('{"status":0,"message":"删除成功"}','utf-8');
                        res.end();
                    }else{
                        res.write('{"status":1,"message":"删除出错啦"}','utf-8');
                        res.end();
                    }
                })
            }
        });
        return;
    }

    // 测试获取和设置cookie
    if(url_obj.pathname === 'getcookie'&&req.method === 'GET'){
        var obj = cookie(req.headers.cookie);
        // 此时obj为设置的cookie的对象：{'xxx':true};
    }
    if(url_obj.pathname === 'setcookie'&&req.method === 'GET'){
        res.setHeader('Set-Cookie',cookie.serialize('xxx','true'));//对应236行
        res.end();
    }

    // 登录后加载admin.html的时候需要做验证
    if(url_obj.pathname === '/admin.html'){
        // 获取到cookie，如果有对应的登录标志isLogin,就返回该页面，如果没有就返回错误页面
        if(cookie.parse(req.headers.cookie || '').isLogin === "true"){
            render("./template"+url_obj.pathname,res);
        }else{
            render("./template/error.html",res);
        }
        return;
    }

    // 点击退出登录时，需要使用户失去权限重新登录
    if(url_obj.pathname === '/logout'){
        res.setHeader('Set-Cookie',cookie.serialize('isLogin',""));
        render("./template/index.html",res);
        return;
    }

    // 根据请求加载入各类数据--渲染静态资源
    render("./template"+url_obj.pathname,res);

    function render(path,res){
        // binary二进制，读取图片时
        fs.readFile(path,'binary',function(err,data){
            if(!err){
                // 写回数据同样需要用二进制返回
                res.write(data,'binary');
                res.end();
            }
        })
    }
})
app.listen(3000,function(err){
    if(!err){
        console.log("listening on 3000...");
    }
});