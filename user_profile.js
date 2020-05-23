// -------------------------------------------user profile landing page------------------------------------------
module.exports = function () {
  var express = require('express')
  var formidable = require('formidable')
  var router = express.Router()

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
    var sql = 'SELECT user_id as id, fname, lname, name as insName, level as insProficiency, email, password, phone, social, zip, lfg, demo_link\n' +
      'FROM users\n' +
      'INNER JOIN instruments\n' +
      'ON users.instrument_id = instruments.instrument_id\n' +
      'INNER JOIN proficiencies \n' +
      'ON users.proficiency_id = proficiencies.proficiency_id WHERE user_id = ?'
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

//--------------------------------------- get single user profile data -------------------------------------------------

  function getInstruments (res, mysql, context, complete) {

    mysql.pool.query('SELECT instrument_id as id, name as insName FROM instruments', function (error, results) {
      if (error) {
        res.write(JSON.stringify(error))
        res.end()
      }
      context.instruments = results
      console.log(results)
      complete()
    })
  }

//--------------------------------------- get single user profile data -------------------------------------------------

  function getProficiency (res, mysql, context, complete) {

    // Construct query--------------------------------------------------------------
    var sql = 'SELECT proficiency_id as id, level as insProficiency FROM proficiencies'
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

//------------------------------------------ get and display single user -----------------------------------------------

  router.get('/:id', redirectLogin, function (req, res) {
    console.log(req.session)
    console.log(req.session.userId)

    var callbackCount = 0
    var context = {}
    context.jsscripts = ['edit_user_profile.js', 'delete_user_profile.js']
    var mysql = req.app.get('mysql')

    // get all data for update
    getUserProfile(res, mysql, context, req.session.userId, complete)

    console.log('Made it back to redirect')

    function complete () {
      callbackCount++
      if (callbackCount >= 1) {
        res.render('user_profile', context)
      }
    }
  })

//----------------------------------- get and display single user for editing ------------------------------------------

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

//----------------------------------- change password page ####not functioning yet######--------------------------------

  router.get('/edit/password/:id', redirectLogin, function (req, res) {
    var callbackCount = 0
    var context = {}
    context.jsscripts = ['edit_user_profile.js', 'delete_user_profile.js']
    var mysql = req.app.get('mysql')

    getUserProfile(res, mysql, context, req.params.id, complete)

    function complete () {
      callbackCount++
      if (callbackCount >= 1) {
        res.render('update_password', context)
      }
    }
  })

//----------------------------------- updates database for user_profile change -----------------------------------------
  //Need to get instrument, skill level, and gig going #############################################

  router.put('/:id', function (req, res) {
    console.log(req.body)
    console.log(req.params.id)
    var mysql = req.app.get('mysql')                   // need to add looking for gig
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

//--------------------------------------------- delete user profiles ---------------------------------------------------
  router.delete('/:id', function (req, res) {
    var mysql = req.app.get('mysql')
    mysql.pool.query('DELETE FROM Users WHERE user_id = ?', req.params.id, function (error) {
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

  return router
}()
