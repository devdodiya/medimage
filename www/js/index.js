/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var deleteThisFile = {}; //Global object for image taken, to be deleted
var centralPairingUrl = "https://atomjump.com/med-genid.php";

var app = {


    // Application Constructor
    initialize: function() {


        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
          app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');
        console.log('Received Event: ' + id);
    },

    takePicture: function() {
      var _this = this;

      navigator.camera.getPicture( function( imageURI ) {
          _this.uploadPhoto(imageURI);
        },
       function( message ) {
        _this.notify( message );
       },
       {
        quality: 100,
        destinationType: Camera.DestinationType.FILE_URI
       });
    },

   get: function(url, cb) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);

        request.onreadystatechange = function() {
            if (request.readyState == 4) {

                if (request.status == 200 || request.status == 0) {

                    cb(url, request.responseText);   // -> request.responseText <- is a result
                }
            }
        }
        request.send();
    },

    scanlan: function(port, cb) {
     var _this = this;

      if(this.lan) {

       var lan = this.lan;


       for(var cnt=0; cnt< 255; cnt++){
          var machine = cnt.toString();
          var url = 'http://' + lan + machine + ':' + port;
          this.get(url, function(goodurl, resp) {
              if(resp) {
                 _this.foundServer = goodurl;
                 clearTimeout(scanning);
                 cb(goodurl, null);
              }
          });


       }

       //timeout after 5 secs
       var scanning = setTimeout(function() {
                _this.notify('Timeout finding your Wifi server.');
                document.getElementById('override-form').style.display = 'block';
       }, 4000);



      } else {

         cb(null,'Sorry, please connect to your Wifi network.');
      }
    },


    notify: function(msg) {
        //Set the user message
        document.getElementById("notify").innerHTML = msg;
    },


    uploadPhoto: function(imageURIin) {

        var _this = this;

        if(_this.foundServer) {

          window.resolveLocalFileSystemURI(imageURIin, function(fileEntry) {

            deleteThisFile = fileEntry; //Store globally



            var imageURI = fileEntry.toURL();
            var options = new FileUploadOptions();
            options.fileKey="file1";

            var tempName = document.getElementById("id-entered").value;
            if(_this.defaultDir) {
                //A hash code signifies a directory to write to
                tempName = "#" + _this.defaultDir + " " + tempName;
            }

            var myoutFile = tempName.replace(/ /g,'-');

			var mydt = navigator.globalization.dateToString(
			  new Date(),
			  function (date) {
				  var mydt = date.value.replace(/:/g,'-');
				  mydt = mydt.replace(/ /g,'-');
				  mydt = mydt.replace(/\//g,'-');

				  var aDate = new Date();
				  var seconds = aDate.getSeconds();
				  mydt = mydt + "-" + seconds;


				  options.fileName = myoutFile + '-' + mydt + '.jpg';

				  options.mimeType="image/jpeg";

				  var params = new Object();
				  params.title = document.getElementById("id-entered").value;


				  options.params = params;
				  options.chunkedMode = false;


				  var ft = new FileTransfer();

				  _this.notify("Uploading to " + _this.foundServer);
				  var serverReq = _this.foundServer + '/api/photo';

            	  ft.upload(imageURI, serverReq, _this.win, _this.fail, options);

			  },
			  function () {alert('Error getting dateString\n');},
			  {formatLength:'medium', selector:'date and time'}
			);




          } );
        } else {
            _this.notify('No server known');
        }
    },

    win: function(r) {
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            document.getElementById("notify").innerHTML = 'Image transferred.';
            document.getElementById("override-form").style.display = 'none';    //Hide any url entry


            //and delete phone version
            deleteThisFile.remove();

    },


    fail: function(error) {

        switch(error.code)
        {
            case 1:
                this.notify("Sorry the photo file was not found on your phone.");
            break;

            case 2:
                this.notify("Sorry you have tried to send it to an invalid URL.");
            break;

            case 3:
                this.notify("You cannot connect to the server at this time. Check if it is running, and try again.");
            break;

            case 4:
                this.notify("Sorry, your image transfer was aborted.");
            break;

            default:
                this.notify("An error has occurred: Code = " + error.code);
            break;
        }
    },

    getip: function(cb) {

           var _this = this;

           //timeout after 3 secs -rerun this.findServer()
           var iptime = setTimeout(function() {
                  var err = "You don't appear to be connected to your wifi. Please connect and try again, or override with your server's url and port.";
                  document.getElementById('override-form').style.display = 'block';
                  cb(err);
           }, 5000);

           networkinterface.getIPAddress(function(ip) {
               _this.ip = ip;
               var len =  ip.lastIndexOf('\.') + 1;
                _this.lan = ip.substr(0,len);
                clearTimeout(iptime);
                cb(null);
           });
    },

    clearOverride: function() {
        localStorage.clear();
        this.foundServer = null;
        document.getElementById("override").value = "";
        alert("Cleared default server.");

    },


    checkDefaultDir: function(server) {
        //Check if the default server has a default dir eg. http://123.123.123.123:5566/write/hello
        var requiredStr = "/write/";
        var startsAt = server.indexOf(requiredStr);
        if(startsAt >= 0) {
            //Get the default dir after the /write/ string
            var startFrom = startsAt + requiredStr.length;
            this.defaultDir = server.substr(startFrom);
            var properServer = server.substr(0, startsAt);
            return properServer;
        } else {
            return server;
        }

    },

    startup: function(overrideServer) {

        //First called at startup time.
        var _this = this;
        if(overrideServer) {
			//Do nothing here
		} else {
			if((document.getElementById("override").value) &&
			  (document.getElementById("override").value != '')) {

			   overrideCode = document.getElementById("override").value;
			   var pairUrl = centralPairingUrl + '?compare=' + overrideCode;
			   _this.notify("Pairing with " + pairUrl);
			   _this.get(pairUrl, function(url, resp) {

				  if(resp == 'nomatch') {
						_this.notify("Sorry, there was no match for that code.");
						return;

				  } else {

					  _this.notify("Paired success with " + resp);
					  var server = resp;

					  //And save this server
					  localStorage.setItem("overrideServer",server);

					  //Rerun again, this time with new default
					 //TEMPOUT _this.startup(server);
					 return;
				   }

			   });

			} else {
				//Check if there is a saved server
				overrideServer = localStorage.getItem("overrideServer");

			}
		}

        if(overrideServer) {
            overrideServer = this.checkDefaultDir(overrideServer);       //Check for a default upload directory
            this.overrideServer = overrideServer;

        }

        if(this.foundServer) {

          //We have already found the server
          var server = this.foundServer;

          //OK we already know the server, or did at least
          //try connecting to it

          _this.notify("Trying to connect..");
          this.get(server, function(url, resp) {

             //ok connected alright

             _this.notify("Connected.");
             clearTimeout(cnct);
             _this.takePicture();

          });

          //timeout after 5 secs
          var cnct = setTimeout(function() {
              _this.notify('Timeout connecting. Please try again.');
              _this.foundServer = null;
           }, 5000);



        } else {

            //Otherwise, first time we are running the app this session
            _this.notify("Looking for server");

             this.findServer(function(err) {

                 if(err) {

                   _this.notify(err);
                 } else {
                    _this.notify("Found server");
                   _this.takePicture();
                 }
             });

        }




    },


    findServer: function(cb) {

       var _this = this;

       if((this.overrideServer)&&(this.overrideServer != "")) {
           //on a user set override, or a dev set override

           var goodurl = this.overrideServer;
           this.foundServer = goodurl;

           _this.notify("Using server: " + goodurl);
           cb(null);
           return;
       }


       _this.notify("Checking Wifi connection");

       this.getip(function(ip, err) {

          if(err) {
             cb(err);
             return;
          }

          _this.notify("Scanning Wifi");

          _this.scanlan('5566', function(url, err) {

             if(err) {
               cb(err);
             } else {
               cb(null);
             }

          });
       });

    }








};
