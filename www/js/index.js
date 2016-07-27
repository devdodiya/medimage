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
        
        
        //Set display name - TODO: check this is valid here
        this.displayServerName();
        
        errorThis = this;

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
          errorThis.uploadPhoto(imageURI);
        },
       function( message ) {
         errorThis.notify( message );
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
                 
                 //Save the first TODO: if more than one, open another screen here
                 localStorage.setItem("currentWifiServer", goodurl);
                 
                 
                 clearTimeout(scanning);
                 cb(goodurl, null);
              }
          });


       }

       //timeout after 5 secs
       var scanning = setTimeout(function() {
                _this.notify('Timeout finding your Wifi server.');
                //old: document.getElementById('override-form').style.display = 'block';
       }, 4000);



      } else {
		  //No lan detected
         cb(null,'Do you have a 4 digit code?');
      }
    },


    notify: function(msg) {
        //Set the user message
        document.getElementById("notify").innerHTML = msg;
    },


    uploadPhoto: function(imageURIin) {
        
    

        var _this = this;
	
		var usingServer = localStorage.getItem("usingServer");
	
		if((!usingServer)||(usingServer == null)) {
			//No remove server already connected to, find the server now. And then call upload again
			_this.findServer(function(err) {
				if(err) {
					errorThis.notify("Sorry, we cannot connect to the server. Trying again in 10 seconds.");
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

			//Have connected OK to a server
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
			
					 
						var serverReq = usingServer + '/api/photo';
		
						var repeatIfNeeded = {
							"imageURI" : imageURI,
							"serverReq" : serverReq,
							"options" :options,
							"failureCount": 0
						};
						retryIfNeeded.push(repeatIfNeeded);

						ft.upload(imageURI, serverReq, _this.win, _this.fail, options);

					  },
					function () { 
						navigator.notification.alert('Error getting dateString\n');
					},
					{ formatLength:'medium', selector:'date and time'}
				); //End of function in globalization date to string




          	});		//End of resolveLocalFileSystemURI
       
         }		//End of connected to a server OK
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
	    	
	    		repeatIfNeeded.failureCount += 1;		//Increase this
	    		if(repeatIfNeeded.failureCount > 3) {
	    			//Have tried too many attempts - try to reconnect completely (i.e. go
	    			//from wifi to network and vica versa
	    			localStorage.setItem("usingServer", null);		//This will force a reconnection
	    			errorThis.uploadPhoto(repeatIfNeeded.imageURI);
	    			
	    		} else {
	    			//OK in the first few attempts - keep the current connection and try again
					setTimeout(function() {
						var ft = new FileTransfer();
					
						ft.onprogress = errorThis.progress;
					
						errorThis.notify("Trying to upload " + repeatIfNeeded.options.params.title);
					
						retryIfNeeded.push(repeatIfNeeded);
					
						ft.upload(repeatIfNeeded.imageURI, repeatIfNeeded.serverReq, errorThis.win, errorThis.fail, repeatIfNeeded.options);
					}, 10000);		//Wait 10 seconds before trying again	
				}
	     	}
      },

    win: function(r) {
    	    
    	    document.querySelector('#status').innerHTML = "";	//Clear progress status
    	    
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            if((r.responseCode == 200)||(r.response.indexOf("200") != -1)) {
            	document.getElementById("notify").innerHTML = 'Image transferred. Success!';
            	            	
            	//Save the current server settings for future reuse
            	errorThis.saveServer();


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
                  var err = "You don't appear to be connected to your wifi. Please connect and try again.";
                  
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

    
    factoryReset: function() {
        //We have connected to a server OK
        var _this = this;
        
    		navigator.notification.confirm(
	    		'Are you sure? All your saved PCs and other settings will be cleared.',  // message
	    		function(buttonIndex) {
	    			if(buttonIndex == 1) {
						localStorage.clear();
						
						localStorage.setItem("usingServer", null);		//Init it
						localStorage.setItem("currentRemoteServer", null);
	   					localStorage.setItem("currentWifiServer", null);
						
						
						//Now refresh the current server display
    					document.getElementById("currentPC").innerHTML = "";
    		
						alert("Cleared all saved PCs.");
		
						errorThis.openSettings();
						
					}
	    		
	    		},                  // callback to invoke
	    		'Clear Settings',            // title
	    		['Ok','Cancel']             // buttonLabels
			);
        
		return false;
    },
    

    checkDefaultDir: function(server) {
        //Check if the default server has a default dir eg. input:
        //   http://123.123.123.123:5566/write/fshoreihtskhfv
        //Where the defaultDir would be set to 'fshoreihtskhfv'
        //Returns 'http://123.123.123.123:5566'
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


	connect: function(results) {
		
    	//Save the server with a name
    	//Get existing settings array
    	
    	
    	
    	switch(results.buttonIndex) {
    	
    		case 1:
    			//Clicked on 'Ok'
    			//Start the pairing process
    			var pairUrl = centralPairingUrl + '?compare=' + results.input1;
			   		errorThis.notify("Pairing..");
			   		errorThis.get(pairUrl, function(url, resp) {

		           	resp = resp.replace('\n', '')

			   		if(resp == 'nomatch') {
						errorThis.notify("Sorry, there was no match for that code.");
						return;

			   		} else {

						errorThis.notify("Pairing success.");
						var server = resp;

			        	//And save this server
						localStorage.setItem("currentRemoteServer",server);


						  navigator.notification.confirm(
							'Do you want to connect via Wifi, if it is available, also?',  // message
							function(buttonIndex) {
								if(buttonIndex == 1) {
									//yes, we also want to connect via wifi
									errorThis.checkWifi(function(err) {
										if(err) {
											//An error finding wifi
											errorThis.notify(err);
										} else {
											//Ready to take a picture, rerun with this
											//wifi server
											errorThis.notify("Wifi paired successfully.");
											errorThis.bigButton();
										}
									});
								} else {
									errorThis.notify("Pairing success. No wifi.");
								}
				
							},                  // callback to invoke
							'Pairing Success!',            // title
							['Yes','No']             // buttonLabels
						);
			        	
      
						return;
			   		}

			   }); //end of get
    			
    			
    		break;
    	
    		case 2:
    			//Clicked on 'Wifi only'
    			//Otherwise, first time we are running the app this session	
				errorThis.checkWifi(function(err) {
					if(err) {
						//An error finding server - likely need to enter a pairing code. Warn the user
						errorThis.notify(err);
					} else {
						//Ready to take a picture, rerun
						errorThis.notify("Wifi paired successfully.");
						errorThis.bigButton();
					}
				});
				
				return;
    		break;
    		
    		default:
    			//Clicked on 'Cancel'
    		
    		break;
    	
		}
	},

    bigButton: function() {

        //Called when pushing the big button
        
        var _this = this;

		_this.findServer(function(err) {
			if(err) {
				//An error finding server - likely need to enter a pairing code. Warn the user
				//No current server - first time with this new connection

				//We have connected to a server OK
				navigator.notification.prompt(
					'Please enter the 4 letter pairing code from your PC.',  // message
					errorThis.connect,                  // callback to invoke
					'New Connection',            // title
					['Ok','Use Wifi Only','Cancel'],             // buttonLabels
					''                 // defaultText
				);
			} else {
				//Ready to take a picture
				_this.takePicture();
			}
		});
		



    },


	checkWifi: function(cb) {
	    errorThis.notify("Checking Wifi connection");

       this.getip(function(ip, err) {

          if(err) {
             cb(err);
             return;
          }

          errorThis.notify("Scanning Wifi");

          errorThis.scanlan('5566', function(url, err) {

             if(err) {
               cb(err);
             } else {
               cb(null);
             }

          });
       });
	
	},

    findServer: function(cb) {

	   //Check storage for any saved current servers, and set the remote and wifi servers
	   //along with splitting any subdirectories, ready for use by the the uploader.
	   //Then actually try to connect - if wifi is an option, use that first
       var _this = this;
       
       var found = false;
       //Clear off
       var foundRemoteServer = null;
       var foundWifiServer = null;
       
       //Early out
       var usingServer = localStorage.getItem("usingServer");
       if((usingServer)&&(usingServer != null)) {
       		cb(null);
       		return;
       	
       }
       
       
	   var foundRemoteServer = localStorage.getItem("currentRemoteServer");
	   var foundWifiServer = localStorage.getItem("currentWifiServer");
	   
	   if((foundRemoteServer)&&(foundRemoteServer != null)) {
	   		//Already found a remote server
	   		//Generate the directory split, if any. Setting RAM foundServer and defaultDir
	   		foundRemoteServer = this.checkDefaultDir(foundRemoteServer);
	   		

	   } 

   	    //Check if we have a Wifi option		
	   if((foundWifiServer)&&(foundWifiServer != null)) {
			//Already found wifi
			//Generate the directory split, if any. Setting RAM foundServer and defaultDir
			foundWifiServer = this.checkDefaultDir(foundWifiServer);
			

	   }
	   
	   

	   //Early out:
	   if((foundWifiServer == null)&&(foundRemoteServer == null)) {
	   		cb('No known server.');
	   		return;
	   }

	   
	   
	   //Now try the wifi server as the first option to use if it exists:
	   if((foundWifiServer)&&(foundWifiServer != null)) {
	   	  //Ping the wifi server
	   	  
	   	  errorThis.notify('Trying to connect to the wifi server..');
	   	  
	   	  
	   	  //Timeout after 5 secs for the following ping
       	  var scanning = setTimeout(function() {
                errorThis.notify('Timeout finding your wifi server. Trying remote server..');
                
                //Else can't communicate with the wifi server at this time.
	   	  	  	//Try the remote server
	   	  	  	if((foundRemoteServer)&&(foundRemoteServer != null)) {
	   	  	  		
	   	  	  		var scanning = setTimeout(function() {
	   	  	  			//Timed out connecting to the remote server - that was the
	   	  	  			//last option.
	   	  	  			localStorage.setItem("usingServer", null);
	   	  	  			cb('No server found');
	   	  	  			
	   	  	  		
	   	  	  		}, 4000);
	   	  	  		
	   	  	  		errorThis.get(foundRemoteServer, function(url, resp) {
	   	  	  		
	   	  	  			//Success, got a connection to the remote server
	   	  	  			clearTimeout(scanning);		//Ensure we don't error out
	   	  	  			localStorage.setItem("usingServer", foundRemoteServer);
	   	  	  			cb(null);
	   	  	  		});
	   	  	  		
	   	  	  	} else {
                	//Only wifi existed
                	localStorage.setItem("usingServer", null);
                	cb('No server found');
            	}
                
       	   }, 2000);
	   	  
	   	  //Ping the wifi server
	   	  errorThis.get(foundWifiServer, function(url, resp) {
	   	  	  
	   	  	  //Success, got a connection to the wifi
	   	  	  clearTimeout(scanning);		//Ensure we don't error out
	   	  	  localStorage.setItem("usingServer", foundWifiServer);
	   	  	  cb(null);			//Success found server
	   	  	  
	   	  
	   	  });
	   
	   } else {
	   		//OK - no wifi option - go straight to the remote server
	   		//Try the remote server
	   		errorThis.notify('Trying to connect to the remote server....');
	   		
	   		var scanning = setTimeout(function() {
	   	  	  			//Timed out connecting to the remote server - that was the
	   	  	  			//last option.
	   	  	  			localStorage.setItem("usingServer", null);
	   	  	  			cb('No server found');
	   	  	  		
	   	  	  		}, 4000);
	   		
			_this.get(foundRemoteServer, function(url, resp) {
				
					//Success, got a connection to the remote server
					clearTimeout(scanning);		//Ensure we don't error out
					localStorage.setItem("usingServer", foundRemoteServer);
					cb(null);
			});
	   
	   
	   }





    },
    
    
    /* Settings Functions */ 
    /*  localStorage.clear();
        this.foundServer = null;
        this.defaultDir = null;
        this.overrideServer = null;
        document.getElementById("override").value = "";
        alert("Cleared default server.");
	return false; */


    openSettings: function() {
    	//Open the settings screen
    	var html = this.listServers();
    	document.getElementById("settings").innerHTML = html;
    	
    	document.getElementById("settings-popup").style.display = "block";
    	
    },
    
    closeSettings: function() {
    	//Close the settings screen
    	document.getElementById("settings-popup").style.display = "none";
    },

    listServers: function() {
    	//List the available servers
    	var settings = this.getArrayLocalStorage("settings");
    	
    	
    	if(settings) {
	    	var html = "<ons-list><ons-list-header>Select a PC to use now:</ons-list-header>";
	    	
	    	//Convert the array into html
	    	for(var cnt=0; cnt< settings.length; cnt++) {
	    		html = html + "<ons-list-item><ons-list-item onclick='app.setServer(" + cnt + ");'>" + settings[cnt].name + "</ons-list-item><div class='right'><ons-icon icon='md-delete' onclick='app.deleteServer(" + cnt + ");'></ons-icon></div></ons-list-item>";
	    	}
	    	
	    	html = html + "</ons-list>";
    	} else {
    		var html = "<ons-list><ons-list-header>PCs Stored</ons-list-header>";
    		var html = html + "<ons-list-item><ons-list-item>Default</ons-list-item><div class='right'><ons-icon icon='md-delete'style='color:#AAA></ons-icon></div></ons-list-item>";
    		html = html + "</ons-list>";
    	}
    	return html;
    },
    
    
    
    setServer: function(serverId) {
    	//Set the server to the input server id
    	var settings = this.getArrayLocalStorage("settings");
    
    	var currentRemoteServer = settings[serverId].currentRemoteServer;			
        var currentWifiServer = settings[serverId].currentWifiServer;	
 
        localStorage.setItem("usingServer", null); //reset the currently used server
       
        //Save the current server TODO: null handling here?
    	localStorage.setItem("currentRemoteServer", currentRemoteServer);
    	localStorage.setItem("currentWifiServer", currentWifiServer);
    	
    	navigator.notification.alert("Switched to: " +  settings[serverId].name, function() {}, "Changing PC");
    	
    	//Now refresh the current server display
    	document.getElementById("currentPC").innerHTML = settings[serverId].name;
    	
    	this.closeSettings();
    	return false;
    	
    },
    
    newServer: function() {
    	//Create a new server. 
    	//This is actually effectively resetting, and we will allow the normal functions to input a new one
    	localStorage.setItem("usingServer", null);
        
        //Remove the current one
        var exists = localStorage.getItem("currentRemoteServer");
        if((exists)&&(exists != null)) {
        	localStorage.removeItem("currentRemoteServer");
        }
        var exists = localStorage.getItem("currentWifiServer");
        if((exists)&&(exists != null)) {
        	localStorage.removeItem("currentWifiServer");
        }

        
		//Ask for a name of the current Server:
		navigator.notification.prompt(
			'Please enter a name for this PC',  // message
			this.saveServerName,                  // callback to invoke
			'PC Name',            // title
			['Ok','Cancel'],             // buttonLabels
			'Main'                 // defaultText
		);
	
	

    	
    },
    
    deleteServer: function(serverId) {
    	//Delete an existing server
    	this.myServerId = serverId;
    	
    	navigator.notification.confirm(
	    		'Are you sure? This PC will be removed from memory.',  // message
	    		function(buttonIndex) {
	    			if(buttonIndex == 1) {
						var settings = errorThis.getArrayLocalStorage("settings");
    	
						if((settings == null)|| (settings == '')) {
							//Nothing to delete 
						} else {
							settings.splice(errorThis.myServerId, 1);  //Remove the entry entirely from array
			
							errorThis.setArrayLocalStorage("settings", settings);
						} 
		
						errorThis.openSettings();	//refresh
					}
	    		
	    		},                  // callback to invoke
	    		'Remove PC',            // title
	    		['Ok','Exit']             // buttonLabels
		);
    	
    	

    },
    

    
    saveServerName: function(results) {
    	//Save the server with a name - but since this is new,
    	//Get existing settings array
    	if(results.buttonIndex == 1) {
    		//Clicked on 'Ok'
    		
    		localStorage.setItem("currentServerName", results.input1);
 
    		//Now refresh the current server display
    		document.getElementById("currentPC").innerHTML = results.input1;
    		
    		errorThis.closeSettings();
    		return;
    	} else {
    		//Clicked on 'Exit'. Do nothing.
     		return;
    	}

     	
    },
    
    displayServerName: function() {
    	//Call this during initialisation on app startup
    	var currentServerName = localStorage.getItem("currentServerName");
    	
    	if((currentServerName) && (currentServerName != null)) {
    		//Now refresh the current server display
    		document.getElementById("currentPC").innerHTML = currentServerName;
    		
    		
    		
    		
    	} else {
    	
    		document.getElementById("currentPC").innerHTML = "";
    	}
    
    
    
    },
    
    saveServer: function() {
        	//Run this after a successful upload
        	
        	
        	
        	var currentServerName = localStorage.getItem("currentServerName");
        	
        	var currentRemoteServer = localStorage.getItem("currentRemoteServer");
    		var currentWifiServer = localStorage.getItem("currentWifiServer");
   			
   			
   			
   			if((!currentServerName) ||(currentServerName == null)) currentServerName = "Default";
   			if((!currentRemoteServer) ||(currentRemoteServer == null)) currentRemoteServer = null;
   			if((!currentWifiServer) ||(currentWifiServer == null)) currentWifiServer = null;	
   		
   			
   		
   			var settings = errorThis.getArrayLocalStorage("settings");
   			
   			//Create a new entry - which will be blank to being with
   			var newSetting = { 
   				"name": currentServerName,		//As input by the user
   				"currentRemoteServer": currentRemoteServer,
   				"currentWifiServer": currentWifiServer
   			};
   			
   			
   		
   			if((settings == null)|| (settings == '')) {
   				//Creating an array for the first time
   				var settings = [];
   				settings.push(newSetting);  //Save back to the array
   			} else {
   				//Check if we are writing over the existing entries
   				var writeOver = false;
   				for(cnt = 0; cnt< settings.length; cnt++) {
   					if(settings[cnt].name == currentServerName) {
   						writeOver = true;
   						settings[cnt] = newSetting;
   					}
   				}
   			
   				if(writeOver == false) {
    				settings.push(newSetting);  //Save back to the array
    			}
   			} 

    		
    		//Save back to the persistent settings
    		errorThis.setArrayLocalStorage("settings", settings);
    		
    		
    		return;
    
    },
    
    //Array storage for app permanent settings (see http://inflagrantedelicto.memoryspiral.com/2013/05/phonegap-saving-arrays-in-local-storage/)
    setArrayLocalStorage: function(mykey, myobj) {
	    return localStorage.setItem(mykey, JSON.stringify(myobj));
    },
    
    getArrayLocalStorage: function(mykey) {
	    return JSON.parse(localStorage.getItem(mykey));
    }






};
