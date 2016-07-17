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
var errorThis = {};  //Used as a global error handler
var retryIfNeeded = [];	//A global pushable list with the repeat attempts
var retryNum = 0;






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

         cb(null,'Do you have a 4 digit code?');
      }
    },


    notify: function(msg) {
        //Set the user message
        document.getElementById("notify").innerHTML = msg;
    },


    uploadPhoto: function(imageURIin) {
        
    

        var _this = this;
        errorThis = this;
	
	if(!_this.foundServer) {
		//No server found in RAM, find the server now. And then call upload again
		_this.findServer(function(err) {
			if(err) {
				_this.notify("Sorry, we cannot connect to the server. Trying again in 10 seconds.");
				//Search again in 10 seconds:
				setTimeout(function() {
					errorThis.uploadPhoto(imageURIin)
					}, 10000);
			} else {
				//Now we are connected, upload the photo again
				errorThis.uploadPhoto(imageURIin);
			}
		});
		return;
	} else {


            window.resolveLocalFileSystemURI(imageURIin, function(fileEntry) {

            deleteThisFile = fileEntry; //Store globally
            



            var imageURI = fileEntry.toURL();
            var options = new FileUploadOptions();
            options.fileKey="file1";

            var tempName = document.getElementById("id-entered").value;
            if((tempName == '')||(tempName == null)) {
                tempName = 'image';
            }

            if(_this.defaultDir) {
                //A hash code signifies a directory to write to
                tempName = "#" + _this.defaultDir + " " + tempName;
            }

            var myoutFile = tempName.replace(/ /g,'-');

	    navigator.globalization.dateToString(
		new Date(),
		function (date) {
         	    var mydt = date.value.replace(/:/g,'-');
                    mydt = mydt.replace(/ /g,'-');
                    mydt = mydt.replace(/\//g,'-');

                    var aDate = new Date();
                    var seconds = aDate.getSeconds();
                    mydt = mydt + "-" + seconds;

		    mydt = mydt.replace(/,/g,'');  //remove any commas from iphone
	
		    options.fileName = myoutFile + '-' + mydt + '.jpg';
	
		    options.mimeType="image/jpeg";
	
		    var params = new Object();
		    params.title = document.getElementById("id-entered").value;
	     	    if((params.title == '')||(params.title == null)) {
	         	params.title = 'image';
	     	    }
	
		    options.params = params;
		    options.chunkedMode = false;
	
	
		    var ft = new FileTransfer();
	            _this.notify("Uploading " + params.title);
	            
	            ft.onprogress = _this.progress;
	            
					     
		    var serverReq = _this.foundServer + '/api/photo';
		    
		    var repeatIfNeeded = {
		    	"imageURI" : imageURI,
		    	"serverReq" : serverReq,
		    	"options" :options
		    };
		    retryIfNeeded.push(repeatIfNeeded);

	            ft.upload(imageURI, serverReq, _this.win, _this.fail, options);
	
		  },
		  function () { alert('Error getting dateString\n'); },
			{ formatLength:'medium', selector:'date and time'}
		  ); //End of function in globalization date to string




          } );		//End of resolveLocalFileSystemURI
       
        }
    },
	
    progress: function(progressEvent) {
    		var statusDom = document.querySelector('#status');
    	
		if (progressEvent.lengthComputable) {
			var perc = Math.floor(progressEvent.loaded / progressEvent.total * 100);
			statusDom.innerHTML = perc + "% uploaded...";
		} else {
			if(statusDom.innerHTML == "") {
				statusDom.innerHTML = "Uploading";
			} else {
				statusDom.innerHTML += ".";
			}
		}
	},
			
    retry: function(existingText) {
    	    
 
	     	var repeatIfNeeded = retryIfNeeded.pop();
	     	
	     	if(repeatIfNeeded) {
	    	 	//Resend within a minute here
	    	 	errorThis.notify(existingText + " Retrying " + repeatIfNeeded.options.params.title + " in 10 seconds.");
	    	
		    	setTimeout(function() {
		    		var ft = new FileTransfer();
		        	
		        	ft.onprogress = errorThis.progress;
		        	
		        	errorThis.notify("Trying to upload " + repeatIfNeeded.options.params.title);
		        	
		        	retryIfNeeded.push(repeatIfNeeded);
		        	
		    		ft.upload(repeatIfNeeded.imageURI, repeatIfNeeded.serverReq, errorThis.win, errorThis.fail, repeatIfNeeded.options);
		    	}, 10000);		//Wait 10 seconds before trying again	
	     	}
      },

    win: function(r) {
    	    
    	    document.querySelector('#status').innerHTML = "";	//Clear progress status
    	    
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            if((r.responseCode == 200)||(r.response.indexOf("200") != -1)) {
            	document.getElementById("notify").innerHTML = 'Image transferred. Success!';
            	document.getElementById("override-form").style.display = 'none';    //Hide any url entry

		//retryNum --;		//Count down the number of retry entries

            	//and delete phone version
            	deleteThisFile.remove();
            } else {
            	//Retry sending
            	errorThis.retry("");
            	
            }

    },


    fail: function(error) {
  
  	document.querySelector('#status').innerHTML = "";	//Clear progress status
  
        switch(error.code)
        {
            case 1:
                errorThis.notify("Sorry the photo file was not found on your phone.");
            break;

            case 2:
                errorThis.notify("Sorry you have tried to send it to an invalid URL.");
            break;

            case 3:
                errorThis.notify("You cannot connect to the server at this time.");
                errorThis.retry("You cannot connect to the server at this time.</br>");
            break;

            case 4:
                errorThis.notify("Sorry, your image transfer was aborted.");
                errorThis.retry("Sorry, your image transfer was aborted.</br>");
            break;

            default:
                errorThis.notify("An error has occurred: Code = " + error.code);
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
        this.defaultDir = null;
        document.getElementById("override").value = "";
        alert("Cleared default server.");
	return false;
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

    startup: function(inOverrideServer) {



        //First called at startup time.
        var _this = this;
        var localOverride = "";

        if(inOverrideServer) {
	       localOverride = inOverrideServer;
	} else {
		
		
	        //Check if there is a saved server
	        localOverride = localStorage.getItem("overrideServer");
			   	     
		if((localOverride == null)|| (localOverride == '')) {
	
		      	//no local storage of server already exists
   		   	//Check if a user entered code
			if((document.getElementById("override").value) &&
			  (document.getElementById("override").value != '')) {

			   overrideCode = document.getElementById("override").value;
			   var pairUrl = centralPairingUrl + '?compare=' + overrideCode;
			   _this.notify("Pairing with " + pairUrl);
			   _this.get(pairUrl, function(url, resp) {

		           resp = resp.replace('\n', '')

			   if(resp == 'nomatch') {
				_this.notify("Sorry, there was no match for that code.");
				return;

			   } else {

			        _this.notify("Paired success with " + resp);
			        var server = resp;

			        //And save this server
				localStorage.setItem("overrideServer",server);
      
      
			        //Clear any previous details
			        this.foundServer = null;
			        this.defaultDir = null;
  
				//Rerun again, this time with new default
				_this.startup(server);
				return;
			   }

			   }); //end of get
			   
			 } else {
			    //No user entered code
			    _this.notify('Please enter a 4 digit code from your PC.');
			 }

			
		       } //end of local override check
	       	} //end of inoverride check
		
		
        //Now process full localOverride into split and default dir
        if((localOverride != "")&&(localOverride != null)) {
          
            localOverride = this.checkDefaultDir(localOverride);       //Check for a default upload directory
            this.overrideServer = localOverride;
 
        }

        if(this.foundServer) {

          //We have already found the server
          var server = this.foundServer;

	  //Take the picture and connect later
	  _this.takePicture();




        } else {
		//Otherwise, first time we are running the app this session	
	    	_this.findServer(function(err) {
	    		if(err) {
	    			//An error finding server - likely need to enter a pairing code. Warn the user
	    			_this.notify(err);
	    		} else {
	    			//Ready to take a pitcure
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
