
// -------------------------------------------user profile landing page------------------------------------------
module.exports = (function () {
    let express = require('express')
    let formidable = require('formidable')
    let fs = require('fs')
    let router = express.Router()

    // ------------------------------------------ session handlers --------------------------------------------
    // handles user if not signed in
    const redirectLogin = (req, res, next) => {
      if (!req.session.userId) {
        res.redirect('/login')
      } else {
        next()
      }
    }

    // handles user if signed in
    const redirectUser_Profile = (req, res, next) => {
      if (req.session.userId) {
        res.redirect('/user_profile/' + req.session)
      } else {
        next()
      }
    }

    // --------------------------------- get single user profile data -----------------------------------------
    function getUserProfile (res, mysql, context, id, complete) {
      // Construct query--------------------------------------------------------------
      var sql = 'SELECT user_id as id, fname, lname, name as insName, level as insProficiency, email, password, phone, social, zip, lfg, demo_link, profile_image\n' +
        'FROM Users\n' +
        'INNER JOIN Instruments\n' +
        'ON Users.instrument_id = Instruments.instrument_id\n' +
        'INNER JOIN Proficiencies \n' +
        'ON Users.proficiency_id = Proficiencies.proficiency_id WHERE user_id = ?'
      var inserts = [id]
      // Query and store results------------------------------------------------------
      mysql.pool.query(sql, inserts, function (error, results) {
        if (error) {
          res.write(JSON.stringify(error))
          res.end()
        }
        context.user_profile = results[0]
        context.uid = results[0].id
        complete()
      })
    }

    //--------------------------------------- get user messages -------------------------------------------------

    function getMessages(res, mysql, context, id, complete) {

        var sql = "SELECT * from Messages WHERE inbox_id = ?";
        var inserts = [id];
        // Query and store results------------------------------------------------------
        mysql.pool.query(sql, inserts, function (error, results) {
            if (error) {
                res.write(JSON.stringify(error));
                res.end();
            }
            context.messages = results;
            complete();
        });
    }
    //--------------------------------------- get sent messages -------------------------------------------------

    function getSentMessages(res, mysql, context, id, complete) {

        var sql = "SELECT * from Messages WHERE sender_id = ?";
        var inserts = [id];

        mysql.pool.query(sql, inserts, function (error, results) {
            if (error) {
                res.write(JSON.stringify(error));
                res.end();
            }
            context.sent = results;
            complete();
        });
    }
    //--------------------------------------- get pending messages -------------------------------------------------

    function getRespondedMessages(res, mysql, context, id, complete) {

        var sql = "SELECT * from Messages WHERE req_response = 0 AND inbox_id = ?";
        var inserts = [id];
        // Query and store results------------------------------------------------------
        mysql.pool.query(sql, inserts, function (error, results) {
            if (error) {
                res.write(JSON.stringify(error));
                res.end();
            }
            context.responded = results;
            complete();
        });
    }


    // --------------------------------------- get single user profile data -------------------------------------------------

    function getInstruments (res, mysql, context, complete) {
      mysql.pool.query('SELECT instrument_id as id, name as insName FROM Instruments', function (error, results) {
        if (error) {
          res.write(JSON.stringify(error))
          res.end()
        }
        context.instruments = results
        complete()
      })
    }

    // --------------------------------------- get single user profile data -------------------------------------------------

    function getProficiency (res, mysql, context, complete) {
      // Construct query--------------------------------------------------------------
      var sql = 'SELECT proficiency_id as id, level as insProficiency FROM Proficiencies'
      // Query and store results------------------------------------------------------
      mysql.pool.query(sql, function (error, results) {
        if (error) {
          res.write(JSON.stringify(error))
          res.end()
        }
        context.proficiencies = results
        complete()
      })
    }

    // ------------------------------------------ get and display single user -----------------------------------------------

    router.get('/:id', redirectLogin, function (req, res) {

      var callbackCount = 0
      var context = {}
      context.jsscripts = ['edit_user_profile.js', 'delete_user_profile.js','message_respond.js'];
      var mysql = req.app.get('mysql')

      // get all data for update
      getUserProfile(res, mysql, context, req.session.userId, function () {
        if (context.user_profile.profile_image === null) {
          context.user_profile.profile_image = '/images/no_profile.png'
        } else {
          let cache = req.app.get('in_mem_cache');
          const imgdata = cache.get(context.user_profile.profile_image);
          if(imgdata === undefined) {
            context.user_profile.profile_image = '/images/no_profile.png'
          } else {
            context.user_profile.profile_image = "data:image/gif;base64," + cache.get(context.user_profile.profile_image);
          }
        }
        complete();
      })
         // get all messages where id matches
      getMessages(res, mysql, context, req.params.id, complete);
      getSentMessages(res, mysql, context, req.params.id, complete);
      getRespondedMessages(res, mysql, context, req.params.id, complete);

      function complete () {
        callbackCount++
        if (callbackCount >= 4) {
          if (callbackCount >= 1) {
            res.render('user_profile', context)
          }
        }
      }

    })

    // ----------------------------------- get and display single user for editing ------------------------------------------

    router.get('/edit/:id', redirectLogin, function (req, res) {
      var callbackCount = 0
      var context = {}
      context.jsscripts = ['edit_user_profile.js', 'delete_user_profile.js']
      var mysql = req.app.get('mysql')

      getUserProfile(res, mysql, context, req.params.id, complete)
      getInstruments(res, mysql, context, complete)
      getProficiency(res, mysql, context, complete)

      function complete () {
        callbackCount++
        if (callbackCount >= 3) {
          res.render('edit_user_profile', context)
        }
      }
    })

    // ----------------------------------- updates database for user_profile change -----------------------------------------

    router.put('/:id', function (req, res) {
      var mysql = req.app.get('mysql') // need to add looking for gig
      mysql.pool.query('UPDATE Users SET fname=?, lname=?, email=?, phone=?, zip=?, instrument_id=?, proficiency_id=?, social=?, demo_link=?  WHERE user_id=?',
        [req.body.fname, req.body.lname, req.body.email, req.body.phone, req.body.zip, req.body.instrument_id, req.body.proficiency_id, req.body.social, req.body.demo_link, req.params.id],
        function (error) {
          if (error) {
            console.log(error)
            res.write(JSON.stringify(error))
            res.end()
          } else {
            res.status(200)
            res.end()
          }
        })
    })

    // --------------------------------------------- delete user profiles ---------------------------------------------------
    router.delete('/:id', function (req, res) {
        var mysql = req.app.get('mysql')
        mysql.pool.query('DELETE FROM Users WHERE user_id = ?', req.session.userId, function (error) {
            if (error) {
                res.write(JSON.stringify(error))
                res.status(400)
                res.end()
            } else {
                res.status(202).end()
                req.session.destroy()
        }
      })
    })

    function base64_encode(file) {
      // read binary data
      var bitmap = fs.readFileSync(file);
      // convert binary data to base64 encoded string
      return new Buffer(bitmap).toString('base64');
    }

    router.post('/edit/profile_image/:id', function (req, res) {
      let form = new formidable.IncomingForm()
      let uid = req.params.id
      let cache = req.app.get('in_mem_cache')

      form.parse(req, function (err, fields, files) {
        let oldpath = files.image.path
        let img_ext = files.image.name.split('.')[1]
        let newpath = `/profile_images/${uid}.${img_ext}`
        console.log(`Saving image file from ${oldpath} to ${newpath}`)
        let img = base64_encode(oldpath);
        cache.set(newpath, img)
        var mysql = req.app.get('mysql') // need to add looking for gig
        mysql.pool.query('UPDATE Users SET profile_image=? WHERE user_id=?',
          [newpath, uid],
          function (error) {
            if (error) {
              console.log(error)
              res.write(JSON.stringify(error))
              res.end()
            } else {
              res.redirect(`/user_profile/${uid}`)
            }
          })
      })
    })
 //--------------------------------------------- respond to messages ---------------------------------------------------
    router.post('/accept', (req, res) => {
        let emp = req.body;
      
        var callbackCount = 0;
        var mysql = req.app.get('mysql');

        //get query params
        mysql.pool.query("SELECT inbox_id, sender_id, fname, lname, phone, social FROM Messages\
                                INNER JOIN Users\
                                ON Users.user_id = Messages.inbox_id\
                                WHERE msg_id = ?;",
            [emp.msg_id],
            function (error, results) {
                if (error) {
                    console.log(error);
                    res.write(JSON.stringify(error));
                    res.end();
                } else {
                    //insert message into musicians inbox w/ contact info
                    var mresults = results[0];
                    mysql.pool.query('INSERT INTO Messages (header, body, inbox_id, sender_id, req_response)\
                                             VALUES ("? ? has accepted your invitation!",\
                                             "Here is their contact information: Phone - ? Social - ?",\
                                             ?, ?, 0);',
                        [mresults.fname, mresults.lname, mresults.phone, mresults.social, mresults.sender_id, mresults.inbox_id],
                        function (error) {
                            if (error) {
                                console.log(error);
                                res.write(JSON.stringify(error));
                                res.end();
                            } else {
                                complete()
                            }
                        })
                    //set required response flag to false
                    mysql.pool.query('UPDATE Messages SET req_response = 0 WHERE msg_id = ?', [emp.msg_id], function (error) {
                        if (error) {
                            console.log(error);
                            res.write(JSON.stringify(error));
                            res.end();
                        } else {
                            complete()
                        }
                    })
                }
            })

        function complete() {
            callbackCount++;
            if (callbackCount >= 2) {
                res.status(200).end();
            }
        }
    });


    router.post('/decline', (req, res) => {
        let emp = req.body;

        var callbackCount = 0;
        var mysql = req.app.get('mysql');

        //get query params
        mysql.pool.query("SELECT inbox_id, sender_id, fname, lname FROM Messages\
                                INNER JOIN Users\
                                ON Users.user_id = Messages.inbox_id\
                                WHERE msg_id = ?;",
            [emp.msg_id],
            function (error, results) {
                if (error) {
                    console.log(error);
                    res.write(JSON.stringify(error));
                    res.end();
                } else {
                    //insert message into musicians inbox w/ contact info
                    var mresults = results[0];
                    mysql.pool.query('INSERT INTO Messages (header, inbox_id, sender_id, req_response)\
                                             VALUES ("? ? has declined your invitation.", ?, ?, 0);',
                        [mresults.fname, mresults.lname, mresults.sender_id, mresults.inbox_id],
                        function (error) {
                            if (error) {
                                console.log(error);
                                res.write(JSON.stringify(error));
                                res.end();
                            } else {
                                complete()
                            }
                        })
                    //set required response flag to false
                    mysql.pool.query('UPDATE Messages SET req_response = 0 WHERE msg_id = ?', [emp.msg_id], function (error) {
                        if (error) {
                            console.log(error);
                            res.write(JSON.stringify(error));
                            res.end();
                        } else {
                            complete()
                        }
                    })
                }
            })

        function complete() {
            callbackCount++;
            if (callbackCount >= 2) {
                res.status(200).end();
            }
        }
    });

    return router
  }
  ()
)
