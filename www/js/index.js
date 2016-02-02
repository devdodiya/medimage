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
        alert( message );
       },
       {
        quality: 50, //Should be: 100,
        destinationType: Camera.DestinationType.FILE_URI
       });
    },
    
   get: function(url, cb) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        
        // alert('about to get' +url);
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200 || request.status == 0) {
                    
                    cb(url, request.responseText);
                    
                    // -> request.responseText <- is a result
                }
            }
        }
        request.send();
    },
    
    scanlan: function(port, cb) {
     var _this = this;

      if(this.lan) {
      
       var lan = this.lan;
       
        
       // todo 0 - 256
       for(var cnt=0; cnt< 255; cnt++){
          var machine = cnt.toString(); 
          var url = 'http://' + lan + machine + ':' + port;
          this.get(url, function(goodurl, resp) {
              if(resp) {
                 _this.foundServer = goodurl + '/api/photo';
                 //window.localStorage.setItem("server", goodurl); //save for later
                 cb(goodurl, null);
              }
          });
          
          
       }
       
       //todo after timeout cb(null,'Try entering your ip.');
       
       
      } else {
      
         cb(null,'Sorry, please connect to your Wifi network.');
      }
    },
    
    
    
    
    uploadPhoto: function(imageURIin) {
    
        var _this = this;
    
        if(_this.foundServer) {
            
          window.resolveLocalFileSystemURI(imageURIin, function(fileEntry) {
            
            var imageURI = fileEntry.toURL();
            var options = new FileUploadOptions();
            options.fileKey="file1";
            options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
            options.mimeType="image/jpeg";
 
            var params = new Object();
             params.title = document.getElementById("id-entered").value;
            
            
            options.params = params;
            options.chunkedMode = false;
            //options.headers = {
            //   Connection: "close"
            //};
 
            var ft = new FileTransfer();
            ft.upload(imageURI, _this.foundServer, _this.win, _this.fail, options);
          } ); 
        } else {
            alert('No server known');
        }
    },
 
    win: function(r) {
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            alert('Image transferred. ' + r.response);
    },
 
    fail: function(error) {
            alert("An error has occurred: Code = " + error.code);
    },
    
    getip: function(cb) {
    
           var _this = this;
 
           networkinterface.getIPAddress(function(ip) { 
               _this.ip = ip;
               var len =  ip.lastIndexOf('\.') + 1;
                _this.lan = ip.substr(0,len);
                cb(ip);
           });
    },
    
    
    startup: function(overrideServer) {
        var _this = this;
        
        if(overrideServer) {
          this.overrideServer = overrideServer;
        }
        
        if(this.foundServer) {
        
          //already know from this session
          this.takePicture();
          // } else {
          //var server = window.localStorage.getItem("server");
          //if(server) {
          
          var server = this.foundServer;
          
              //OK we already know the server, or did at least
              //try connecting to it
              this.get(server, function(url, resp) {
              
                 //ok connected alright
                 clearTimeout(cnct);
                 //_this.foundServer = server + '/api/photo';
                 _this.takePicture();
              
              });
              
              //timeout after 3 secs -rerun this.findServer()
              var cnct = setTimeout(function() { alert('timeout connectng');}, 3000);
              
             /* _this.findServer(function(err) {
                 
                   if(err) {
                     alert(err);
                   } else {
                      _this.takePicture();
                   }
              }), 3000):*/
             
        } else {
             this.findServer(function(err) {
                 
                 if(err) {
                   alert(err);
                 } else {
                   _this.takePicture();
                 }
             });
          
        }
          
        
       
    
    },
    
    
    findServer: function(cb) {
       
       var _this = this;
       
       if(this.overrideServer) {
           //on a user set override, or a dev set override
           
           var goodurl = this.overrideServer;
           this.foundServer = goodurl + '/api/photo';
           window.localStorage.setItem("server", goodurl); //save for later
           cb(null);
           return;
       }
      
         
       
       this.getip(function() {
          
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
