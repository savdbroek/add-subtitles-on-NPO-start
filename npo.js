// ==UserScript==
// @name         add-subtitles-on-NPO-start
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Retrieve NPO caption and add translated subtitles to NPO video
// @author
// @match        https://www.npostart.nl/*
// @match        https://start-player.npo.nl/embed/*
// @grant        none
// ==/UserScript==

window.addEventListener('load', function () {
    // console.log("tampermonkey loaded")

    // Script for the main video page
    if (document.URL.includes("npostart.nl")) {
        if (window.top === window.self) {

            // only add the button /shortcut on the video pages
            var topMenu = document.getElementsByClassName("npo-menu")
            if (topMenu.length == 0) {
                var button = document.createElement("button");
                button.innerHTML = "Watch with translated Subtitle (or Alt+L)";
                button.onclick = getCaptionAndOpenVideoPayer;
                button.style.position = "absolute";
                button.style.top = "0px";
                button.style.left = "0px";
                button.style.zIndex  = "9999";
                document.body.appendChild(button);

                // add  event shorctut on the main page (but doesn't work for the iframe)
                document.addEventListener("keydown", function (key) {
                    if (key.altKey && key.code === "KeyL") { //  ●  to find the key name : https://keyjs.dev/
                        getCaptionAndOpenVideoPayer()

                    }
                }, true);
            }
        } // end if window.top === window.self

        // script for the video player page
    } else if (document.URL.includes("start-player.npo.nl/embed")) {
        if (window.top === window.self) {
            // add a textarea to retrieve the translated subtitles
            var divM = document.createElement("div");
            divM.innerHTML = `
                      <textarea id="vttTextAreaEN" placeholder="Paste English subs and press Enter" style="position: absolute; top: 0px; left: 0px; width: 200px; height: 80%; border: none; z-index: 99;></textarea>
                      <!--textarea id="vttTextAreaNL" placeholder="NL subs"></textarea>-->
                      `
            document.body.appendChild(divM);

            // retrieve previous translated subtitles and add them to the textarea
            var textarea = document.getElementById("vttTextAreaEN")

            var url1000 = document.URL.substring(230, 1000);
            textarea.value = localStorage.getItem(url1000)

            // add focus to textarea
            textarea.focus()

            // ● optional: this will remove the dark overlay that makes it difficult to read the subtitles when on pause/send shortcut + it move the volume button to the right side. This block can be commented out.
            var styles = `
                    video::-webkit-media-text-track-display {
            bottom: 50px !important;
            top: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            text-align: center !important;
            font-size: 1.2em !important;
            color: white !important;
            background-color: rgba(0, 0, 0, 0.6) !important; /* Optional: Adds a semi-transparent background to the subtitles for better readability */
        }
            `;
            var styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);

            // ● comment until here if you wan to keep the dark overlay and the volume button on the left side

            // add event when press Enter on the textarea
            var textareaSourceEn = document.getElementById('vttTextAreaEN');
            textareaSourceEn.addEventListener('keydown', function (e) {
                if (e.key == 'Enter') {

                    // retrieve the translated subtitles and remove the textarea
                    var vttTranslatedEn = document.getElementById('vttTextAreaEN').value
                    var elem = document.getElementById("vttTextAreaEN");
                    elem.parentNode.removeChild(elem);

                    /******************** ● option 1: add translated subtitles to the player via <track>  ********************/
                    //  cons: the subtitles language doesn't appear in the player settings
                    //  pros: captions and translated subtitles are display simultaneously

                    // modify the position of the subtitles (the size parameter doesn't work, it's modified via css cf below)
                    // vttTranslatedEn = vttTranslatedEn.replaceAll("line:90% position:50% align:middle", "line:10% position:20% align:left"); // ● replace "line:10% position:20% align:left" by whatever you want
                    vttTranslatedEn = vttTranslatedEn.replaceAll(/line:\d+% position:\d+% align:middle/g, "line:10% position:20% align:left"); // ● replace "line:10% position:20% align:left" by whatever you want

                    // save the translated subtitles in the local storage
                    var url1000 = document.URL.substring(230, 1000);
                    localStorage.setItem(url1000, vttTranslatedEn);

                    // add the translated subtitles to the player
                    const type = 'text/plain'
                    const blob = new Blob([vttTranslatedEn], {
                        type
                    })
                    const url = URL.createObjectURL(blob)

                    document.getElementById("video_html5_api").innerHTML = '<track label="English Captions" srclang="en" kind="captions" src=' + url + ' type="text/vtt" default />';

                    // change the size of the text   ●
                    var styles = `
                          video::-webkit-media-text-track-display {
                          font-size: 50%;
                          }
                        `
                    var styleSheet = document.createElement("style")
                    styleSheet.innerText = styles
                    document.head.appendChild(styleSheet)

                    // add a shorcut to toggle the display of the translated subtitles
                    // there is probably a better way to do this than with a "memory variable"
                    var displayState = 1;
                    document.addEventListener("keydown", toggleDisplayTranslatedSub_viaShortcut, false);

                    function toggleDisplayTranslatedSub_viaShortcut(key) {

                        if (key.code === "ArrowLeft") {
                            console.log('enter')
                            const ke = new KeyboardEvent('keydown', {
                                bubbles: true,
                                cancelable: true,
                                keyCode: 13
                            });
                            document.body.dispatchEvent(ke);
                        }
                        if (key.altKey && key.code === "KeyL") { //  ●  to find the key name : https://keyjs.dev/
                            if (displayState) {
                                var stylesA = `
                              video::-webkit-media-text-track-display {
                               display: none;
                               }
                              `
                                var styleSheetA = document.createElement("style")
                                styleSheetA.innerText = stylesA
                                document.head.appendChild(styleSheetA)
                                displayState = 0
                            } else {
                                var stylesB = `
                             video::-webkit-media-text-track-display {
                             display: block;
                             }
                           `
                                var styleSheetB = document.createElement("style")
                                styleSheetB.innerText = stylesB
                                document.head.appendChild(styleSheetB)
                                displayState = 1
                            }
                        }
                    }

                    /******************** ● option 2: add translated subtitles to the player via player.addRemoteTextTrack: ********************/
                    // pro: the translated subtitles appears in the player setting
                    // cons: couldn't find a way to make the captions and translated subtitles display simultaneously (also it should be possible)

                    // // turn the translated subtitles into a blob that is then used as an URL
                    // const type = 'text/plain'
                    // const blob = new Blob([vttTranslatedEn], {
                    //   type
                    // })
                    // const url = URL.createObjectURL(blob)

                    // // add the translated subtitles to the player
                    // // https://stackoverflow.com/a/65019326
                    // let captionOption = {
                    //   kind: 'subtitles',
                    //   srclang: 'en',
                    //   label: 'English',
                    //   src: url
                    // };
                    // player.addRemoteTextTrack(captionOption)
                    // const tracks = player.remoteTextTracks();
                    // for (let i = 0; i < tracks.length; i++) {
                    //   const track = tracks[i];
                    //   if (track.kind === 'subtitle' && track.language === 'en') {
                    //     track.mode = 'showing';
                    //   }
                    // }

                    /******************** ● Still in development:  ********************/
                    // Trying to make translated subtitles added via player.addRemoteTextTrack appear simultaneously with the original caption

                    // // first trying to remove all tracks (text and remoteText), enable the player.textTrackDisplay.allowMultipleShowingTracks and then add the tracks
                    // const tracks = player.textTracks();
                    // for (let i = 0; i < tracks.length; i++) {
                    //   const track = tracks[i];
                    //   player.textTracks().removeTrack(track)
                    //   // player.removeTrack(track)

                    // }

                    // const tracksr = player.remoteTextTracks();
                    // for (let i = 0; i < tracksr.length; i++) {
                    //   const trackr = tracksr[i];
                    //   player.remoteTextTracks().removeTrack(trackr)
                    //   // player.removeTrack(track)

                    // }
                    // // make sure that the tracks are removed
                    // console.log(player.remoteTextTracks())
                    // console.log(player.textTracks())

                    // // enable settings to allow  multiple subtitles at once
                    // player.textTrackDisplay.allowMultipleShowingTracks = true

                    // // option 2 should be copy/paste here twice to back the orginal caption and the translated subtitles (this needs a second textarea to send the orignal caption along with the translated one)

                    // then enable all tracks
                    // player.textTracks()[0].mode = 'disabled';
                    // player.textTracks()[0].mode = 'showing';
                    // player.textTracks()[1].mode = 'disabled';
                    // player.textTracks()[1].mode = 'showing';

                } // end of "enter" event
            }); // end of dispatch event

        } // if window.top
    } // end if url
})

// // trying to translate directly the subtitles without using VSCode Subtitle Editor
// function translateSubtitles(text) {

//   // https://github.com/pavladan/subtitles-parser-vtt
//   var fromVtt = function (data, timeFormat, isYoutubeAutoTranscript) {
//     var useYoutubeAutoTranscript = isYoutubeAutoTranscript ? true : false;
//     data = data.replace(/\r/g, "");
//     var regex = /(\d+)?\n?(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3}).*\n/g;
//     data = data.split(regex);
//     data.shift();
//     var items = [];
//     for (var i = 0; i < data.length; i += 4) {
//       var text = data[i + 3];
//       if (useYoutubeAutoTranscript) {
//         text = text.split("\n");
//         text.shift();
//         text = text.join("\n");
//       }
//       if (text.trim().length === 0) continue;
//       items.push({
//         id: data[i] ? +data[i].trim() : items.length + 1,
//         startTime: changeTimeFormat(data[i + 1].trim(), timeFormat),
//         endTime: changeTimeFormat(data[i + 2].trim(), timeFormat),
//         text: text.trim(),
//       });
//     }
//     return items;
//   };

//   var datasplit = fromVtt(text, 's');
//   console.log(datasplit)

//   datasplit.forEach(element => {

//     var textA = element.text

//     urlAss = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent('en') + "&dt=t&q=" + encodeURIComponent(textA)

//     fetch(urlAss).then(function (response) {
//       return response.json();
//     }).then(function (data) {
//       console.log("translate", data[0][0][0]);
//     }).catch(function () {
//       console.log('Booo');
//     });

//   });
// }

function getCaptionAndOpenVideoPayer() {
    var episodeID = document.URL.split("/").pop().split("?")[0];
    var urlVTT = "https://assetscdn.npostart.nl/subtitles/original/nl/" + episodeID + ".vtt";

    var vttContentM = "";
    fetch(urlVTT)
        .then(response => response.text())
        .then(vttContent => {
            vttContentM = vttContent;

            var button = document.createElement('button');
            button.textContent = 'Copy to Clipboard';
            button.style.position = 'fixed';
            button.style.top = '50px';
            button.style.left = '10px';
            button.style.zIndex = '9999';
            button.addEventListener('click', () => {
                navigator.clipboard.writeText(vttContentM).then(() => {
                    console.log('Content copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            });
            document.body.appendChild(button);

            var buttonOpenNewTab = document.createElement('button');
            buttonOpenNewTab.textContent = 'Open Video in New Tab';
            buttonOpenNewTab.style.position = 'fixed';
            buttonOpenNewTab.style.top = '90px';
            buttonOpenNewTab.style.left = '10px';
            buttonOpenNewTab.style.zIndex = '9999';
            buttonOpenNewTab.addEventListener('click', () => {
                var urlIframe = document.getElementsByTagName("iframe")[0].src;
                window.open(urlIframe, '_blank').focus();
            });
            document.body.appendChild(buttonOpenNewTab);
        })
        .catch(() => alert('problem!'));
}
