/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome Email Extsntion installed/updated.')
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let action = request.action
  if (action === 'GetCookies') {
    return getCookies(request, sendResponse)
  }
  if (action === 'SetCookies') {
    return setCookies(request, sendResponse)
  }
  if (action === 'ClearCookies') {
    return clearCookies(request, sendResponse)
  }
})

function getCookies(request, sendResponse) {
  console.log('Received GetCookies action for domain: ', request.domain)
  if (!chrome.cookies) {
    console.error('Chrome cookies API is not avaliable.')
    sendResponse({ cookies: [] })
    return true
  }
  chrome.cookies.getAll({ domain: request.domain }, function (cookies) {
    if (chrome.runtime.lastError) {
      console.error('chrome.cookies.getAll error: ', chrome.runtime.lastError)
      sendResponse({ cookies: [] })
    } else {
      sendResponse({ cookies: cookies })
    }
  })
  return true
}

function setCookies(request, sendResponse) {
  const { url, domain, value } = request
  console.log('Received SetCookies action for URL: ', url)
  const expirationDate = Math.floor(Date.now() / 1000) + 3600 // 1 小时后过期
  value.forEach((cookie) => {
    chrome.cookies.set(
      {
        url: url,
        domain: domain,
        name: cookie.name,
        value: cookie.value,
        path: '/',
        expirationDate: cookie.expirationDate ? cookie.expirationDate : expirationDate
      },
      (cookie) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome SetCookies for URL error: ', chrome.runtime.lastError)
        }
        sendResponse(cookie)
      }
    )
  })
  // 设置一个定时器
  setupClearCookiesTimer(domain, 60)
  return true
}

function clearCookies(request, sendResponse) {
  console.log('Received ClearCookies action for doamin: ', request.domain)
  chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
    cookies.forEach((cookie) => {
      chrome.cookies.remove({ url: `https://${cookie.domain}${cookie.path}`, name: cookie.name })
    })
    sendResponse({ cookies: [] })
  })
  return true
}

// 清理指定域名下的 cookie 的函数
function clearCookiesForDomain(domain) {
  chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
    cookies.forEach((cookie) => {
      chrome.cookies.remove(
        { url: `https://${cookie.domain}${cookie.path}`, name: cookie.name },
        (details) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome RemoveCookie error: ', chrome.runtime.lastError)
          } else {
            console.log(`Cookie ${cookie.name} cleared from domain ${cookie.domain}.`)
          }
        }
      )
    })
  })
}

// 设置定时器来清理指定域名下的 cookies
function setupClearCookiesTimer(domain, intervalInMinutes) {
  chrome.storage.local.get('timers', (result) => {
    const timers = result.timers || {}
    if (!timers[domain]) {
      // 没有为该域名创建定时器
      chrome.alarms.create(`clearCookies_${domain}`, { periodInMinutes: intervalInMinutes })
      timers[domain] = true

      chrome.storage.local.set({ timers }, () => {
        console.log(`Timer set for domain ${domain}`)
      })
    } else {
      console.log(`Timer already exists for domain ${domain}`)
    }
  })

  chrome.alarms.onAlarm.addListener((alarm) => {
    const alarmName = `clearCookies_${domain}`
    if (alarm.name === alarmName) {
      clearCookiesForDomain(domain)
    }
  })
}
