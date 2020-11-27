
/**
* @author: Mar labs
* @date: January 28, 2021
* @purpose: The below function is to create chat bot, for which starting point is chatInit()
*/

let isUserLogged = false
let userAuthType
let counter = 0
let canStartPolling = false
let languageKey
let createUUID = Math.floor(100000000000000000 + Math.random() * 900000000000000000).toString()
const url = 'http://localhost:5005/webhooks/rest/'
const imageServerPath = './'

/** This methods wll be executed on window load */
window.onload = function () {
  chatInit()
}

/** Once window load is done this entry point for the chat bot */
function chatInit () {
  addStyle()
  getHostedCountryParam()
  const chat = document.createElement('div')
  chat.id = 'xpms_container'
  chat.setAttribute('class', 'xpms_container')
  document.body.appendChild(chat)
  createChatConatiner()
  checkIfUserLogggedIn()
  checkIfLocalStoragePresent()
}

function getHostedCountryParam () {
  const hostUrl = window.location.href
  const param = hostUrl.split('/')
  for (let i = 0; i < param.length; i++) {
    if (param[i].includes('merckgroup.com')) {
      languageKey = param[i + 1]
      break
    }
    if (param[i].includes('chatBot.html')) {
      languageKey = 'cn-zh'
      break
    }
  }
}

/** This method will appened the style link to the head element */
function addStyle () {
  const chatCss = document.createElement('link')
  chatCss.setAttribute('rel', 'stylesheet')
  chatCss.setAttribute('href', imageServerPath + 'chatBot.css')
  document.head.appendChild(chatCss)
}

/** This method will create chat bot conatiner */
function createChatConatiner () {
  const parentElement = document.getElementById('xpms_container')
  const chatchild = document.createElement('div')
  chatchild.id = 'xpms_chat_bot'
  chatchild.style.display = 'none'
  parentElement.appendChild(chatchild)
  const image = document.createElement('img')
  image.src = imageServerPath + 'logo_chat.png'
  image.setAttribute('id', 'open-icon')
  image.addEventListener('click', toggleChat)
  parentElement.appendChild(image)
  const mainElement = document.getElementById('xpms_chat_bot')
  const chatheader = document.createElement('div')
  chatheader.setAttribute('id', 'xpms-chat-header')
  chatheader.innerText = 'Application Support'
  mainElement.appendChild(chatheader)
  addCloseIcon()
  addHomeIcon()
  const chatDiv = document.createElement('div')
  chatDiv.setAttribute('id', 'xpms-chat-container')
  mainElement.appendChild(chatDiv)
  const inputDiv = document.createElement('div')
  inputDiv.setAttribute('id', 'chat-input')
  mainElement.appendChild(inputDiv)
  addInputField()
}

/** This method will appened the close icon into the haeder */
function addCloseIcon () {
  const mainElement = document.getElementById('xpms-chat-header')
  const weChatImage = document.createElement('img')
  weChatImage.src = imageServerPath + 'chatbot_magenta.png'
  weChatImage.setAttribute('id', 'header_bot_icon')
  mainElement.insertAdjacentElement('afterbegin', weChatImage)
  const image = document.createElement('img')
  image.src = imageServerPath + 'close.png'
  image.setAttribute('class', 'header-icon')
  image.setAttribute('id', 'close-icon')
  image.setAttribute('title', 'Close')
  image.addEventListener('click', canCloseChat)
  mainElement.appendChild(image)
}

/** This method will appened the home icon into the haeder */
function addHomeIcon () {
  const mainElement = document.getElementById('xpms-chat-header')
  const image = document.createElement('img')
  image.src = imageServerPath + 'icon_refresh.png'
  image.setAttribute('class', 'header-icon')
  image.setAttribute('id', 'home-icon')
  image.setAttribute('title', 'Home')
  image.addEventListener('click', canCloseChat)
  mainElement.appendChild(image)
}

/** This method will close or reset the chatbox on click of home/close icon */
function canCloseChat (action) {
  localStorage.removeItem('senderId')
  localStorage.removeItem('chatHistory')
  const mainDiv = document.getElementById('xpms-chat-container')
  while (mainDiv.lastChild) {
    mainDiv.removeChild(mainDiv.lastChild)
  }
  botInteraction('/reset_chat')
  if (action.target.id === 'home-icon') {
    removeButtons()
    document.getElementById('input').value = ''
   //

    document.getElementById('input').disabled = true
  }
  if (action.target.id === 'close-icon') {
    toggleChat()
  }
}

/** This method will check if user is login or not and set boolean as true/false */
function checkIfUserLogggedIn () {
  const sessionCookie = window.mkgDL
  if (sessionCookie && sessionCookie.user && sessionCookie.user.authStatus && sessionCookie.user.authStatus === 'logged-in') {
    if (sessionCookie.user.authType) {
      userAuthType = sessionCookie.user.authType
    }
    localStorage.removeItem('senderId')
    localStorage.removeItem('chatHistory')
    isUserLogged = true
    canStartPolling = false
  } else {
    isUserLogged = false
    if (canStartPolling) {
      setTimeout(checkIfUserLogggedIn, 20000)
    }
  }
}

/** This method will add chat bot text on click */
function addBotChatText (input) {
  const mainDiv = document.getElementById('xpms-chat-container')
  const botDiv = document.createElement('div')
  botDiv.id = '_xpms_bot' + counter
  botDiv.setAttribute('class', 'bot-chat talk-bubble bot-round btm-left-in')
  botDiv.innerHTML += input
  mainDiv.append(botDiv)
  appenedTimeStamp('_xpms_bot', counter, imageServerPath + '/chatbot_magenta.png', 'bot_icon', 'date_stamp_bot')
  counter++
}

/** This method will append the click time in the chat */
function appenedTimeStamp (id, index, path, _class, _chatClass) {
  const currentTime = new Date()
  const timeDiv = document.getElementById(id + index)
  const timestamp = document.createElement('sup')
  timeDiv.insertAdjacentHTML('afterbegin', '<img src=' + path + " id='chat_icon' class=" + _class + '>')
  timestamp.id = _chatClass
  timestamp.innerText = currentTime.toLocaleTimeString()
  timeDiv.appendChild(timestamp)
}

/** This method will add user chat on click */
function addUserChatText (input) {
  const mainDiv = document.getElementById('xpms-chat-container')
  const userDiv = document.createElement('div')
  userDiv.id = '_xpms_user' + counter
  userDiv.setAttribute('class', 'user-chat talk-bubble user-round')
  userDiv.innerText = input
  mainDiv.append(userDiv)
  appenedTimeStamp('_xpms_user', counter, imageServerPath + 'icon_user_circle.png', 'user_icon', 'date_stamp_user')
  counter++
}

/** API call for interation of user and bot */
function botInteraction (data) {
  const payload = { message: data, sender: createUUID}
  fetch(url + 'webhook', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'Content-type': 'application/x-www-form-urlencoded'
    }
  }).then(res => res.json())
    .then(response => {
      createDomSuggestion(response)
      smoothScroll()
    })
    .catch(error => console.error('Error:', error))
}

/** This method will create bot suggestion according to resposne */
function createDomSuggestion (response) {
  if (response.length > 0) {
    for (let i = 0; i < response.length; i++) {
      if (response[i].text) {
        addBotChatText(response[i].text)
      }
      if (response[i].buttons && response[i].buttons.length > 0) {
        const userDiV = document.getElementById('xpms-chat-container')
        const buttonDiv = document.createElement('div')
        buttonDiv.setAttribute('id', 'custom-button')
        for (let j = 0; j < response[i].buttons.length; j++) {
          const newChild = document.createElement('button')
          newChild.setAttribute('class', 'child-button round')
          newChild.setAttribute('id', 'child-button-key')
          newChild.setAttribute('payload', response[i].buttons[j].payload)
          newChild.innerText = response[i].buttons[j].title
          if (response[i].buttons[j].href) {
            newChild.setAttribute('href', response[i].buttons[j].href)
          }
          newChild.addEventListener('click', onButtonClick)
          buttonDiv.appendChild(newChild)
        }
        userDiV.append(buttonDiv)
      }
      if (response[i].dropdown && response[i].dropdown.length > 0) {
        const userDiV = document.getElementById('xpms-chat-container')
        const optionDiv = document.createElement('div')
        optionDiv.setAttribute('id', 'custom-option')
        const selectTag = document.createElement('select')
        selectTag.setAttribute('id', 'mySelect')
        if (response[i].dropdown.length > 6) {
          selectTag.setAttribute('size', 6)
        }
        selectTag.addEventListener('change', onSelectClick)
        const optionTag = document.createElement('option')
        optionTag.value = 'Select'
        optionTag.innerText = 'Select'
        optionTag.disabled = true
        optionTag.selected = true
        selectTag.append(optionTag)
        for (let j = 0; j < response[i].dropdown.length; j++) {
          const optionTag = document.createElement('option')
          optionTag.value = response[i].dropdown[j].payload
          optionTag.innerText = response[i].dropdown[j].title
          optionTag.setAttribute('payload', response[i].dropdown[j].payload)
          selectTag.append(optionTag)
        }
        optionDiv.append(selectTag)
        userDiV.append(optionDiv)
      }
      if (response[i].custom) {
        createDomSuggestion(response[i].custom)
      }
      if (response[i].enable_textbox === true) {
        //document.getElementById('input').disabled = false
      }
      if (response[i].enable_calender === true) {
        addCalender()
      }
      if (response[i].store_conversation === true) {
        const chatHistory = document.getElementById('xpms-chat-container')
        localStorage.setItem('chatHistory', chatHistory.innerHTML)
        localStorage.setItem('senderId', createUUID)
        canStartPolling = true
        checkIfUserLogggedIn()
      }
    }
  }
}

/** This method will do the action as selected by the user */
function onButtonClick (e) {
  const selectedData = e.target.getAttribute('payload')
  const innerSelectedText = e.target.innerText;
  const url = e.target.getAttribute('href')
  if (url) {
    window.open(url, '_blank')
  } else {
    const mainDiv = document.getElementById('xpms-chat-container')
    mainDiv.removeChild(mainDiv.lastChild)
    botInteraction(selectedData)
    addUserChatText(innerSelectedText)
  }
}

/** when dropdown is selected by the user */
function onSelectClick (e) {
  const selectedData = e.target.value
  const selectedIndex = e.target.selectedIndex;
  let key = e.target[selectedIndex].outerText
  const mainDiv = document.getElementById('xpms-chat-container')
  mainDiv.removeChild(mainDiv.lastChild)
  botInteraction(selectedData)
  addUserChatText(key)
}

/**  This method append the question as per user input search */
function appendQuestions (data) {
  const chatDiv = document.getElementById('chat-input')
  const chatinDiV = document.createElement('div')
  chatinDiV.setAttribute('id', 'question')
  chatDiv.append(chatinDiV)
  removeButtons()
  for (let i = 0; i < data.questions.length; i++) {
    const userDiV = document.getElementById('question')
    const quesDiv = document.createElement('div')
    quesDiv.setAttribute('class', 'response-question round')
    quesDiv.setAttribute('value', data.questions[i])
    quesDiv.innerText = data.questions[i]
    quesDiv.addEventListener('click', onQuestionClick)
    userDiV.appendChild(quesDiv)
  }
} 

/** This method executes when the user click on the suggested question */
function onQuestionClick (e) {
  const text = e.target.innerText
  removeInput()
  addUserChatText(text)
  botInteraction(text)
 // document.getElementById('input').disabled = true
}

/** This add a input field the chat container */
function addInputField () {
  const mainDiv = document.getElementById('chat-input')
  while (mainDiv && mainDiv.lastChild) {
    mainDiv.removeChild(mainDiv.lastChild)
  }
  const inputDiv = document.createElement('input')
  inputDiv.id = 'input'
  inputDiv.setAttribute('placeholder', 'Please enter here')
  inputDiv.setAttribute('class', 'round')
//  inputDiv.addEventListener('input', checkInput)
  mainDiv.append(inputDiv)
  //document.getElementById('input').disabled = true
  const imageIcon = document.createElement('img')
  imageIcon.id = 'remove_input'
  imageIcon.setAttribute('src', imageServerPath + 'chat_remove.png')
  imageIcon.addEventListener('click', removeInput)
  const clickImage = document.createElement('img')
  clickImage.src = imageServerPath + 'enter.png'
  clickImage.setAttribute('id', 'date_enter_icon')
  clickImage.addEventListener('click', onInputQuestion)
  mainDiv.append(imageIcon)
  inputDiv.insertAdjacentElement('afterend', clickImage)
}

function addCalender () {
  const todayDate = new Date()
  let month = todayDate.getMonth() + 1
  let day = todayDate.getDate()
  const year = todayDate.getFullYear()
  if (month < 10) {
    month = '0' + month.toString()
  }
  if (day < 10) {
    day = '0' + day.toString()
  }
  const maxLimit = year + '-' + month + '-' + day
  const priorDate = new Date()
  priorDate.setDate(priorDate.getDate() - 180)
  let priorMonth = priorDate.getMonth() + 1
  let priorDay = priorDate.getDate()
  const priorYear = priorDate.getFullYear()
  if (priorMonth < 10) {
    priorMonth = '0' + priorMonth.toString()
  }
  if (priorDay < 10) {
    priorDay = '0' + priorDay.toString()
  }
  const minLimit = priorYear + '-' + priorMonth + '-' + priorDay
  const mainDiv = document.getElementById('chat-input')
  while (mainDiv && mainDiv.lastChild) {
    mainDiv.removeChild(mainDiv.lastChild)
  }
  const inputDiv = document.createElement('input')
  inputDiv.setAttribute('type', 'date')
  inputDiv.setAttribute('value', maxLimit)
  inputDiv.setAttribute('id', 'calender-Input')
  inputDiv.setAttribute('min', minLimit)
  inputDiv.setAttribute('max', maxLimit)
  const clickImage = document.createElement('img')
  clickImage.src = imageServerPath + 'enter.png'
  clickImage.setAttribute('id', 'date_enter_icon')
  clickImage.addEventListener('click', calendarInput)
  mainDiv.append(inputDiv)
  inputDiv.insertAdjacentElement('afterend', clickImage)
}


function calendarInput () {
  const inputValue = document.getElementById('calender-Input')
  const key = inputValue.value
  botInteraction(key)
  addUserChatText(key)
  addInputField()
}

/** Call onclick of user input */
function onInputQuestion (e) {
  const inputValue = document.getElementById('input')
  const key = inputValue.value;
  botInteraction(key)
  addUserChatText(key)
  document.getElementById('input').value = ''
 // checkInput()
}

/** On call this method will scroll down to last div element */
function smoothScroll () {
  const mainDiv = document.getElementById('xpms-chat-container')
  if (mainDiv.lastChild) {
    mainDiv.lastChild.scrollIntoView(false)
  };
}

/** On click, it will toggle the chat-bot */
function toggleChat () {
  const mainDiv = document.getElementById('xpms_chat_bot')
  const clickIcon = document.getElementById('open-icon')
  if (mainDiv.style.display === 'none') {
    mainDiv.style.display = 'block'
    clickIcon.style.display = 'none'
  } else {
    mainDiv.style.display = 'none'
    clickIcon.style.display = 'block'
    localStorage.removeItem('senderId')
    localStorage.removeItem('chatHistory')
  }
}

/** This method check if local storage data is present, if yes then it will show the stored chat history */
function checkIfLocalStoragePresent () {
  if (localStorage.getItem('chatHistory') && localStorage.getItem('senderId')) {
    const storedChatHistory = localStorage.getItem('chatHistory')
    document.getElementById('xpms-chat-container').innerHTML += storedChatHistory
    const senderID = localStorage.getItem('senderId')
    createUUID = senderID
    const conatinerDiv = document.getElementById('xpms_chat_bot')
    conatinerDiv.style.display = 'block'
    const clickIcon = document.getElementById('open-icon')
    clickIcon.style.display = 'none'
    document.querySelectorAll('#child-button-key').forEach(item => {
      item.addEventListener('click', onButtonClick)
    })
    setTimeout(smoothScroll, 100)
  } else {
    botInteraction('/get_started')
  }
}

/** Removes the question button */
function removeButtons () {
  const childDiv = document.getElementById('question')
  while (childDiv && childDiv.lastChild) {
    childDiv.removeChild(childDiv.lastChild)
  }
}

/** To set the input field as empty */
function removeInput () {
  removeButtons()
  document.getElementById('input').value = ''
  checkInput()
}

/**  Toggele close Icon */
function checkInput () {
  const userInput = document.getElementById('input')
  const closeIcon = document.getElementById('remove_input')
  if (userInput) {
    if (userInput.value !== '') {
      closeIcon.style.display = 'block'
    } else {
      closeIcon.style.display = 'none'
      removeButtons()
    }
  }
}
