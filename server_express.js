var express = require('express');
var compression = require('compression');
var app = express();
var bodyParser = require('body-parser');
var url = require('url')
var fs = require('fs');
var mysql = require('mysql');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var communitys = multer({dest: 'communitys/'});
var userProfiles = multer({dest: 'userProfiles/'});
var async = require('async')

app.use(compression());
app.use(bodyParser.urlencoded({

  extended: true

}));

app.use(bodyParser.json());

function renameFile(oldname, newname){
  fs.rename(oldname, newname, function (err) {
    if (err) {console.log(err); return; }
    console.log('The file has been re-named to: ' + newname);
  });
}

function successPost(){
  var json = {result : "200"};
  return json
}


function errorPost(){
  var json = {
    result : "에러 발생"
  };
  return json
}

function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval + "년전";
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval + "달전";
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval + "일전";
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval + "시간전";
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval + "분전";
  }

  return Math.floor(seconds) + "초전";
}

function readStream(filePath){
  if(!filePath){
    return null
  } else {
    return fs.createReadStream(filePath);
  }
}



function removeFile(filename){
  if(filename != null){
    fs.unlink(filename.toString(), function(err) {
      if(err && err.code == 'ENOENT') {
        console.info("File doesn't exist, won't remove it.");
      } else if (err) {
        console.error("Error occurred while trying to remove file");
      } else {
        console.log("file removed")
      }
    });
  }
}

function getDataFromString(data){
  var str = data.replace(/\s/g,'');
  var year = str.substring(0,4)
  var month = str.substring(5,7)
  var day = str.substring(8,10)
  var hour = str.substring(10,12)
  var min = str.substring(13,15)
  var sec = str.substring(16,18)
  return new Date(year,month-1,day,hour,min,sec)
}



Date.prototype.yyyymmddhhmmss = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? "0" + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd  = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
  var hh = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
  var min = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
  var ss = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds();
  return yyyy + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + ss;
};

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "A1!aarlxmr",
  database: "reviewPhotos",
  multipleStatements: true
});

con.connect(function(err) {
  if (err){
    console.log("connect error");
  } else {
    console.log("Connected! MY SQL");
  }
});

app.post('/api/isUserOn',function(req,res, next){
  console.log("/api/isUserOn")
  var json;
  console.log("user", req.query)
  con.query("SELECT user_id, user_nick FROM User",function(err,result,fields){
    if(err) return next(err);
    if(!result.length) {
      json = {
        result: "empty"
      }
      res.json(json)
      return
    } else {
      for(var i =0;i<result.length;i++){
        var id = result[i].user_id
        if(id == req.query.UserId){
          json = {
            result: "200",
            name: result[i].user_nick
          }
          res.json(json)
          return
        }
      }
      json = {
        result : "wrong"
      }
      res.json(json)
    }
  });
});

app.post('/api/RegisterAccount', function(req,res, next){
  console.log("/api/RegisterAccount")
  console.log("account :", req.query);
  var ds = new Date().yyyymmddhhmmss()
  var param = [req.query.UserId, req.query.Nick,req.query.Email,req.query.Age,req.query.Gender,req.query.isKakao,ds];
  con.query("INSERT INTO User(user_id,user_nick,user_email,user_age,user_gender,user_iskakao,user_createdDate) VALUES (?,?,?,?,?,?,?)",param,function(err, result){
    if(err) return next(err);
    res.json(successPost());
  });
});

app.post('/api/RegisterAccountImage',userProfiles.single('userProfile'),function(req,res){
  console.log("/api/RegisterAccountImage")
  var filenames = req.file.originalname
  var ds = new Date().yyyymmddhhmmss()
  var oldFilePath = 'userProfiles/'+req.file.filename
  var newFilePath = 'userProfiles/'+req.file.filename +'_'+new Date().yyyymmddhhmmss()+'.jpg'

  fs.rename(oldFilePath, newFilePath, function (err) {
    if (err) {console.log(err); return; }
    console.log('The file has been re-named to: ' + newFilePath);
  });

  var param = [req.body.UserId, req.body.Nick,req.body.Email,req.body.Age,req.body.Gender,req.body.isKakao,ds,newFilePath];
  con.query("INSERT INTO User(user_id,user_nick,user_email,user_age,user_gender,user_iskakao,user_createdDate,user_profile) VALUES (?,?,?,?,?,?,?,?)",param,function(err, result){
    if(err) return next(err);
    res.json(successPost())
  })
});

app.post('/api/GetHomeReviewItem2',function(req,res, next){
  console.log("api/GetHomeReviewItem2")
  var o = {};
  var key = 'reviewModel';
  o[key] = [];
  var length;
  query = 'SELECT id, review_titles, review_photos FROM reviews ORDER BY id DESC LIMIT 10'
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    console.log(result.length)
    length = result.length
    for(var i=0;i<length;i++){
      var data = {
        reviewId : result[i].id,
        title : result[i].review_titles,
        images : result[i].review_photos,
      };
      o[key].push(data);
    }
    res.send(o)
    console.log("GetHomeReviewItem2 SENT ")
  });
});

app.post('/api/GetHomeCommunityItem2',function(req,res, next){
  console.log("api/GetHomeCommunityItem2")
  var o = {};
  var key = 'CommunityModel';
  o[key] = [];
  var length;
  query = 'SELECT id, community_title, community_image1 FROM CommunitysItem ORDER BY id DESC LIMIT 10'
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    console.log(result.length)
    length = result.length
    for(var i=0;i<length;i++){
      var data = {
        communityid : result[i].id,
        title : result[i].community_title,
        images : result[i].community_image1,
      };
      o[key].push(data);
    }
    res.send(o)
    console.log("GetHomeCommunityItem2 SENT ")
  });
});

app.post('/api/GetReviewItem2',function(req,res, next){
  console.log("api/getReviewItem2")
  var o = {};
  var key = 'reviewModel';
  o[key] = [];
  var length;
  query = 'SELECT T1.*, T2.user_profile, T2.user_nick FROM reviews as T1 INNER JOIN User as T2 on T1.user_id=T2.user_id ORDER BY T1.id DESC LIMIT 10'
  con.query(query,function(err,result,fields){
    if(err) return next(err);
    console.log(result.length)
    length = result.length
    for(var i=0;i<length;i++){
      var data = {
        reviewId : result[i].id,
        title : result[i].review_titles,
        text : result[i].review_texts,
        images : result[i].review_photos,
        thumbnail : result[i].user_profile
      };
      o[key].push(data);
    }
    res.send(o)
    console.log("ReviewImage SENT ")
  });
});

app.post('/api/ScrollGetReviewItem2',function(req,res, next){
  console.log("api/ScrollGetReviewItem2 " + req.query.ReviewId)
  var o = {};
  var key = 'reviewModel';
  o[key] = [];
  var length;
  var id = req.query.ReviewId
  var data = parseInt(id)-1
  var query = 'SELECT T1.*, T2.user_profile FROM reviews as T1 INNER JOIN User as T2 on T1.user_id=T2.user_id WHERE T1.id BETWEEN ? AND ? ORDER BY T1.id DESC'

  con.query(query,[data-9,data],function(err,result,fields){
    if(err) return next(err);
    length = result.length
    if(length == 0){
      res.json(o)
    } else {
      for(var i=0;i<length;i++){
        var data = {
          reviewId : result[i].id,
          title : result[i].review_titles,
          text : result[i].review_texts,
          images : result[i].review_photos,
          thumbnail : result[i].user_profile
        };
        o[key].push(data);
      }
      res.send(o)
      console.log("Scrolled ReviewImage SENT ")
    }
  });

});

app.post('/api/GetSearchedReviewItem2',function(req,res, next){
  console.log("api/GetSearchedReviewItem2")
  var o = {};
  var key = 'reviewModel';
  o[key] = [];
  query = 'SELECT T1.*, T2.user_profile FROM reviews as T1 INNER JOIN User as T2 on T1.user_id=T2.user_id WHERE T1.review_titles LIKE ? ORDER BY T1.id DESC LIMIT 10'
  con.query(query,'%' + [req.query.SearchText] + '%',function(err,result,fields){
    if(err) return next(err);
    for(var i=0;i<result.length;i++){
      var data = {
        reviewId : result[i].id,
        title : result[i].review_titles,
        text : result[i].review_texts ,
        images : result[i].review_photos,
        thumbnail : result[i].user_profile
      };
      o[key].push(data);
    }
    res.json(o)
    console.log("ReviewImage SENT ")
  });
});

app.post('/api/GetScrollSearchedReviewItem2',function(req,res, next){
  console.log("api/GetScrollSearchedReviewItem2 " + req.query.ReviewId)
  var o = {};
  var key = 'reviewModel';
  o[key] = [];
  var id = req.query.ReviewId
  var data = parseInt(id)-1
  var query2 = 'SELECT T1.*, T2.user_profile FROM reviews as T1 INNER JOIN User as T2 on T1.user_id=T2.user_id WHERE T1.id < ? AND T1.review_titles LIKE ? ORDER BY T1.id DESC LIMIT 10'
  var d2 = [data,'%'+ req.query.SearchText + '%', ]

  con.query(query2,d2,function(err,result,fields){
    if(err) return next(err);
    if(result.length == 0){
      res.json(o)
    } else {
      for(var i=0;i<result.length;i++){
        var data = {
          reviewId : result[i].id,
          title : result[i].review_titles,
          text : result[i].review_texts,
          images : result[i].review_photos,
          thumbnail : result[i].user_profile
        };
        o[key].push(data);
      }
      res.json(o)
    }
  });
});

app.post('/api/SetReviewPhotos',upload.single('images'),(req,res, next) => {
  console.log("/api/SetReviewPhotos")
  var formdata = req.body
  var formfile = req.file
  var userid = req.body.UserId
  var filenames = req.file.originalname
  var titles = req.body.review_titles
  var texts = req.body.review_texts
  var ds = new Date().yyyymmddhhmmss()
  var oldFilePath = 'uploads/'+req.file.filename
  var newFilePath = 'uploads/'+req.file.filename +'_'+new Date().yyyymmddhhmmss()+'.jpg'
  renameFile(oldFilePath,newFilePath)
  var param = [userid,req.body.review_titles, req.body.review_texts, newFilePath,ds];

  con.query("INSERT INTO reviews(user_id,review_titles,review_texts,review_photos,review_time) VALUES (?,?,?,?,?)",param,function(err, result){
    if(err) {
      removeFile(newFilePath)
      return next(err);
    }
    console.log("Review ADDED");
    res.json(successPost())
  })
});

app.post('/api/SetCommunityPhotos',communitys.array('images',4),(req,res, next) => {
  console.log("/api/setCommunityPhotos")
  var UserId = req.body.UserId
  var UserNick = req.body.UserNick
  var Title = req.body.QuestionTitle
  var Text = req.body.QuestionText
  var newFilePaths = new Array(4);
  var date = new Date().yyyymmddhhmmss()
  for(var i = 0; i< req.files.length ; i++) {
    var ds = (new Date()).toISOString().replace(/[^0-9]/g, "");
    var oldFilePath = 'communitys/'+req.files[i].filename
    var newFilePath = 'communitys/'+req.files[i].filename +'_'+date+'.jpg'
    renameFile(oldFilePath,newFilePath)
    newFilePaths[i] = newFilePath
  }
  var param = [UserId, UserNick,Title,Text, newFilePaths[0],newFilePaths[1],newFilePaths[2],newFilePaths[3],date];

  con.query("INSERT INTO CommunitysItem(user_id,user_nick,community_title,community_text,community_image1,community_image2,community_image3,community_image4,community_times) VALUES (?,?,?,?,?,?,?,?,?)",param,function(err, result){
    if(err) {
      removeFile(newFilePath[0])
      removeFile(newFilePath[1])
      removeFile(newFilePath[2])
      removeFile(newFilePath[3])
      return next(err);
    }
    res.json(successPost())
    console.log("Community ADDED");
  })
})

app.post('/api/GetCommunityItem', (req,res, next) => {
  console.log("/api/GetCommunityItem")
  var o = {};
  var key = 'CommunityModel';
  o[key] = [];
  var firstResult = [];
  var resultlength;
  var sizes = 0;
  async.waterfall([

    function(callback){

      con.query("SELECT id,user_id,user_nick,community_title,community_text,community_image1,community_times FROM CommunitysItem ORDER BY id DESC LIMIT 10",function(err,result){
        firstResult = result
        resultlength = result.length
        callback(null,firstResult)
      })
    },

    function(firstdata, callback){
      for(var i =0; i<resultlength; i++){
        con.query('SELECT id FROM CommunityInnerComment WHERE comment_communityid = ?',[firstdata[i].id], function(err, rows, fields){
          if(err) return next(err);
          var data = {
            userid : firstResult[sizes].user_id,
            communityid : firstResult[sizes].id,
            nickname : firstResult[sizes].user_nick,
            time : timeSince(getDataFromString(firstResult[sizes].community_times)),
            title : firstResult[sizes].community_title,
            text : firstResult[sizes].community_text,
            image : firstResult[sizes].community_image1,
            comments : rows.length
          }
          o[key].push(data);
          sizes++;
          if(sizes == resultlength){
            callback(null,o)
          }
        });
      }
    }
  ], function(err,data){
    if(err) return next(err);
    res.json(data)
    console.log("COMMUNITY ITEM SENT")
  });
});

app.post('/api/ScrollGetCommunityItem', (req,res, next) => {
  console.log("/api/ScrollGetCommunityItem")
  var o = {};
  var key = 'CommunityModel';
  o[key] = [];
  var id = parseInt(req.query.CommunityId)-1
  var commentsCount;
  var firstResult = [];
  var resultlength;
  var sizes = 0;
  async.waterfall([

    function(callback){

      con.query("SELECT id,user_id,user_nick,community_title,community_text,community_image1,community_times FROM CommunitysItem WHERE id BETWEEN ? AND ? ORDER BY id DESC",[id-9,id],function(err,result){
        if(result.length == 0){
          res.json(o)
        } else {
          firstResult = result
          resultlength = result.length
          callback(null,firstResult)
        }
      });
    },
    function(firstdata, callback){
      for(var i =0; i<resultlength; i++){
        con.query('SELECT id FROM CommunityInnerComment WHERE comment_communityid = ?',[firstdata[i].id], function(err, rows, fields){
          if(err) return next(err);
          var data = {
            userid : firstResult[sizes].user_id,
            communityid : firstResult[sizes].id,
            nickname : firstResult[sizes].user_nick,
            time : timeSince(getDataFromString(firstResult[sizes].community_times)),
            title : firstResult[sizes].community_title,
            text : firstResult[sizes].community_text,
            image : firstResult[sizes].community_image1,
            comments : rows.length
          }
          o[key].push(data);
          sizes++;
          if(sizes == resultlength){
            callback(null,o)
          }
        });
      }
    }
  ], function(err,data){
    if(err) return next(err);
    res.json(data)
    console.log("COMMUNITY ITEM SENT")
  });
});

app.post('/api/GetSearchedCommunityItem', (req,res, next) => {
  console.log("/api/GetSearchedCommunityItem")
  var o = {};
  var key = 'CommunityModel';
  o[key] = [];
  var firstResult = [];
  var resultlength;
  var sizes = 0;
  console.log(req.query.UserId)
  console.log(req.query.SearchText)
  async.waterfall([

    function(callback){
      con.query('SELECT id,user_id,user_nick,community_title,community_text,community_image1,community_times FROM CommunitysItem WHERE community_title LIKE ? ORDER BY id DESC LIMIT 10',['%'+req.query.SearchText+'%'],function(err,result){
        firstResult = result
        resultlength = result.length
        callback(null,firstResult)
      })
    },
    function(firstdata, callback){
      for(var i =0; i<resultlength; i++){
        con.query('SELECT id FROM CommunityInnerComment WHERE comment_communityid = ?',[firstdata[i].id], function(err, rows, fields){
          if(err) return next(err);
          var data = {
            userid : firstResult[sizes].user_id,
            communityid : firstResult[sizes].id,
            nickname : firstResult[sizes].user_nick,
            time : timeSince(getDataFromString(firstResult[sizes].community_times)),
            title : firstResult[sizes].community_title,
            text : firstResult[sizes].community_text,
            image : firstResult[sizes].community_image1,
            comments : rows.length
          }
          o[key].push(data);
          sizes++;
          if(sizes == resultlength){
            callback(null,o)
          }
        });
      }
    }
  ], function(err,data){
    if(err) return next(err);
    res.json(data)
    console.log("COMMUNITY ITEM SENT")
  });
});

app.post('/api/GetScrollSearchedCommunityItem', (req,res, next) => {
  console.log("/api/GetScrollSearchedCommunityItem")
  var o = {};
  var key = 'CommunityModel';
  o[key] = [];
  var id = parseInt(req.query.CommunityId)-1
  var commentsCount;
  var firstResult = [];
  var resultlength;
  var sizes = 0;
  async.waterfall([

    function(callback){
      con.query("SELECT id,user_id,user_nick,community_title,community_text,community_image1,community_times FROM CommunitysItem WHERE id < ? AND community_title LIKE ? ORDER BY id DESC LIMIT 10",[id,'%' + req.query.SearchText + '%'],function(err,result){
        console.log(result.length)
        if(result.length == 0){
          res.json(o)
        } else {
          firstResult = result
          resultlength = result.length
          callback(null,firstResult)
        }
      });
    },
    function(firstdata, callback){
      for(var i =0; i<resultlength; i++){
        con.query('SELECT id FROM CommunityInnerComment WHERE comment_communityid = ?',[firstdata[i].id], function(err, rows, fields){
          if(err) return next(err);
          var data = {
            userid : firstResult[sizes].user_id,
            communityid : firstResult[sizes].id,
            nickname : firstResult[sizes].user_nick,
            time : timeSince(getDataFromString(firstResult[sizes].community_times)),
            title : firstResult[sizes].community_title,
            text : firstResult[sizes].community_text,
            image : firstResult[sizes].community_image1,
            comments : rows.length
          }
          o[key].push(data);
          sizes++;
          if(sizes == resultlength){
            callback(null,o)
          }
        });
      }
    }
  ], function(err,data){
    if(err) return next(err);
    res.json(data)
    console.log("COMMUNITY ITEM SENT")
  });
});

app.post('/api/GetInnerCommunityItem',(req,res, next) => {
  console.log("/api/GetInnerCommunityItem")
  console.log(req.query)
  var id = req.query.CommunityId
  var data;
  con.query('SELECT * FROM CommunitysItem WHERE id = ?',[id],function(err,result){
    if(err) return next(err);
    for(var i = 0;i<result.length;i++){
      data = {
        userid : result[i].user_id,
        communityid : result[i].id,
        nickname : result[i].user_nick,
        time : result[i].community_times,
        title : result[i].community_title,
        text : result[i].community_text,
        image1 : result[i].community_image1,
        image2 : result[i].community_image2,
        image3 : result[i].community_image3,
        image4 : result[i].community_image4
      }
    }
    res.json(data)
    console.log("Inner Community Item Sent")
  })
})

app.post('/api/GetInnerCommunityComment',(req,res, next) => {
  console.log("/api/GetInnerCommunityComment")
  var o = {};
  var key = 'CommunityInnerCommentModel';
  o[key] = [];
  var id = req.query.CommunityId
  var data;
  var query = "SELECT T1.*, T2.user_profile FROM CommunityInnerComment as T1 INNER JOIN User as T2 on T1.comment_userid=T2.user_id WHERE comment_communityid = ? ORDER BY id DESC"

  con.query(query,[id], function(err,result){
    if(err) return next(err);
    for(var i = 0;i<result.length;i++){
      data = {
        commentid : result[i].id,
        userid : result[i].comment_userid,
        communityid : result[i].comment_communityid,
        nickname : result[i].comment_nickname,
        time : timeSince(getDataFromString(result[i].comment_time)),
        comment : result[i].comment_comment,
        image : result[i].user_profile,
        like : result[i].comment_like
      }
      o[key].push(data);
    }
    res.json(o)
    console.log("Inner Community Item Sent")
  })
})

app.post('/api/SetInnerCommunityComment',(req,res, next) => {
  var userid = req.query.UserId
  var cid = req.query.CommunityId
  var username = req.query.UserNick
  var comment = req.query.Comment
  var image = req.query.UserImage
  var date = new Date().yyyymmddhhmmss()
  var param = [userid, cid, username, date, comment, image, 0]

  con.query('INSERT INTO CommunityInnerComment(comment_userid,comment_communityid,comment_nickname,comment_time,comment_comment,comment_image,comment_like) VALUES (?,?,?,?,?,?,?)',param,function(err,result){
    if(err) return next(err);
    res.json(successPost())
    console.log("Inner Comment Inserted Successfully")
  });
});

app.post('/api/GetSettingUserProfile', (req,res, next) => {
  console.log("/api/GetSettingUserProfile")
  var query = 'SELECT * FROM User where user_id = ?'
  var userid = req.query.UserId
  var data;
  con.query(query,[userid],(err, result) => {
    if(err) return next(err);
    data = {
      UserId : result[0].user_id,
      UserNick : result[0].user_nick,
      UserEmail: result[0].user_email,
      UserProfile : result[0].user_profile,
      UserAge: result[0].user_age,
      UserGender: result[0].user_gender
    }
    res.json(data)
    console.log("Sent UserProfile")
  });
});

app.post('/api/SetSettingProfileImage',userProfiles.single('images'), (req,res, next) => {
  console.log("api/SetSettingProfileImage")
  var userid = req.body.UserId
  var oldprofiles;
  async.waterfall([

    function(callback){
      con.query("SELECT user_profile FROM User WHERE user_id = ? ",[userid],function(err,result){
        console.log(result)
        if(result != null){
          oldprofiles = result[0].user_profile;
          removeFile(oldprofiles)
        }
        callback(null)
      });
    },
    function(callback){
      var filenames = req.file.originalname
      var ds = new Date().yyyymmddhhmmss()
      var oldFilePath = 'userProfiles/'+req.file.filename
      var newFilePath = 'userProfiles/'+req.file.filename +'_'+new Date().yyyymmddhhmmss()+'.jpg'
      renameFile(oldFilePath, newFilePath)
      var param = [newFilePath, req.body.UserId];
      con.query("Update User SET user_profile = ? WHERE user_id = ? ",param,function(err, result){
        if(err) {
          removeFile(newFilePath)
          return next(err);
        }
      });
      callback(null,successPost())
    }
  ], function(err,data){
    if(err) return next(err);
    res.json(data)
    console.log("Setting api profiles changed")
  });
});

app.post('/api/GetSettingNotificationItem', (req,res , next) => {
  console.log("/api/GetSettingNotificationItem")
  var o = {};
  var key = 'settingNotificationModel';
  o[key] = [];
  var query = 'SELECT * FROM Setting_notification ORDER BY id DESC'

  con.query(query, (err, result) => {
    if(err) return next(err);
    var length = result.length
    for(var i=0;i<length;i++){
      data = {
        NotificationId : result[i].id,
        NotificationTitle : result[i].notification_title,
        NotificationText: result[i].notification_text,
        NotificationTime : result[i].notification_time
      }
      o[key].push(data)
    }
    res.send(o)
  });
});

app.post('/api/GetSettingErrorItem', (req,res , next) => {
  console.log("/api/GetSettingErrorItem")
  var o = {};
  var key = 'settingErrorModel';
  o[key] = [];
  var query = 'SELECT * FROM Errors ORDER BY id DESC LIMIT 20'
  con.query(query, (err, result) => {
    if(err) return next(err);
    console.log("error SELECT DONE")
    var length = result.length
    for(var i=0;i<length;i++){
      data = {
        UserId : result[i].user_id,
        ErrorTitle : result[i].error_title,
        ErrorContent: result[i].error_content,
        Errorid : result[i].id,
        ErrorDate: result[i].error_time,
        ErrorTab: result[i].error_tab
      }
      o[key].push(data)
    }
    res.send(o)
  });
});

app.post('/api/SetSettingErrorItem', (req,res, next) => {
  console.log("/api/SetSettingErrorItem")
  var id = req.query.UserId
  var title = req.query.ErrorTitle
  var content = req.query.ErrorContent
  var time = new Date().yyyymmddhhmmss()
  var tab = req.query.ErrorTab
  var query = 'INSERT INTO Errors(user_id, error_title, error_content, error_time, error_tab) VALUES (?,?,?,?,?)'

  con.query(query,[id,title,content,time,tab], (err, result) => {
    if(err) return next(err);
    console.log("error INSERT DONE")
    res.send(successPost())
  });
});

app.get('/uploads/:name',function(req,res){
  var filename = req.params.name
  fs.readFile('uploads/'+filename, function(err, content){
    if (err) {
      res.writeHead(400, {'Content-type':'text/html'})
      console.log(err);
      res.end("No such image");
    } else {
      res.writeHead(200,{'Content-type':'image/jpg'});
      res.end(content);
    }
  });
});

app.get('/userProfiles/:name',function(req,res){
  var filename = req.params.name
  fs.readFile('userProfiles/'+filename, function(err, content){
    if (err) {
      res.writeHead(400, {'Content-type':'text/html'})
      console.log(err);
      res.end("No such image");
    } else {
      res.writeHead(200,{'Content-type':'image/jpg'});
      res.end(content);
    }
  });
});

app.get('/communitys/:name',function(req,res){
  var filename = req.params.name
  fs.readFile('communitys/'+filename, function(err, content){
    if (err) {
      res.writeHead(400, {'Content-type':'text/html'})
      console.log(err);
      res.end("No such image");
    } else {
      res.writeHead(200,{'Content-type':'image/jpg'});
      res.end(content);
    }
  });
});


app.use(function(err, req, res, next){
  res.send({ message : error.message })
});



app.listen(6327);
