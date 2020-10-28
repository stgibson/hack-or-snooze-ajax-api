$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $editArticleForm = $("#edit-article-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $userProfileInfo = $("#user-profile");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  let editingStoryId = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in. If successfully we will setup the user
   * instance.
   */
  $loginForm.on("submit", async function(evt) {
    // no page-refresh on submit
    evt.preventDefault();

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up. If successfully we will setup a new user
   * instance.
   */
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call create, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for creating a new story
   */
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault();
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    const newStory = { author, title, url };
    const story = await storyList.addStory(currentUser, newStory);

    if (!story) {
      return;
    }

    const result = generateStoryHTML(story);
    $allStoriesList.prepend(result);

    // also add story to own stories
    currentUser.addStory(story);
    const resultOwnStory = generateMyStories(story);
    $ownStories.append(resultOwnStory);

    // clear form
    $submitForm.trigger("reset");
  });

  /**
   * Log out functionality
   */
  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event handler for clicking login
   */
  $navLogin.on("click", function() {
    // show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for navigation to homepage
   */
  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    generateFavorites();
    generateMyStories();

    // if user logged in, show the form to create new surveys
    if (currentUser) {
      $submitForm.show();
      displayUserInfo();
    }

    $allStoriesList.show();
  });

  /**
   * Event handler for adding a story to favorites
   */
  $allStoriesList.on("click", ".fa-heart", async function(evt) {
    const storyId = evt.target.parentElement.id;
    if (currentUser) {
      await currentUser.like(storyId);
      generateFavorites();
    }
  });

  /**
   * Event handler for removing a story from favorites
   */
  $("#favorited-articles")
    .on("click", ".fa-times-circle", async function(evt) {
    const storyId = evt.target.parentElement.id.split("favorite-")[1];
    await currentUser.unlike(storyId);
    generateFavorites();
  });

  /**
   * Event handler for removing a story that the current user created
   */
  $ownStories.on("click", ".fa-times-circle", async function(evt) {
    const storyId = evt.target.parentElement.id.split("my-article-")[1];
    await storyList.removeStory(currentUser, storyId);
    currentUser.removeStory(storyId);
    generateStories();
    generateFavorites();
    generateMyStories();
  });

  /**
   * Event handler to show edit article form when user clicks on edit button to
   * edit a story.
   */
  $ownStories.on("click", "button", evt => {
    // save the id of the story being edited to a global variable
    editingStoryId = evt.target.parentElement.id.split("my-article-")[1];

    // fill the form with the current story data
    const story = currentUser.getStoryById(editingStoryId);
    if (story) {
      $("#edit-author").val(story.author);
      $("#edit-title").val(story.title);
      $("#edit-url").val(story.url);
    }

    // show the edit story form
    $editArticleForm.show();
  });

  /**
   * Prevent page from refreshing if click on a button in the edit article
   * form.
   */
  $editArticleForm.on("submit", evt => {
    evt.preventDefault();
  });

  $("#button-change").on("click", async function() {
    // get values user typed into inputs
    const newAuthor = $("#edit-author").val();
    const newTitle = $("#edit-title").val();
    const newUrl = $("#edit-url").val();

    // validate user input
    if (!newAuthor || !newTitle || !newUrl) {
      return;
    }

    const newStoryData = {
      author: newAuthor,
      title: newTitle,
      url: newUrl
    }

    // edit story
    const newStory = await storyList.editStory(currentUser, editingStoryId, newStoryData);
    
    if (newStory) {
      currentUser.editStory(newStory);
    }

    // regenerate all articles
    generateStories();
    generateFavorites();
    generateMyStories();

    // hide form
    $editArticleForm.hide();
  });

  /**
   * Event handler to hide the edit article form when the cancel button is
   * clicked.
   */
  $("#button-cancel").on("click", () => {
    $editArticleForm.hide();
  });

  /**
   * On page load, checks local storage to see if the user is already logged
   * in. Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();
    generateFavorites();
    generateMyStories();

    if (currentUser) {
      // show the form to create new surveys
      $submitForm.show();
      displayUserInfo();

      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the form to create new surveys
    $submitForm.show();

    // show the stories
    $allStoriesList.show();

    // show favorites for the user, if he/she has any
    generateFavorites();

    // show user's own stories, if he/she has any
    generateMyStories();

    // display user profile
    displayUserInfo();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * Displays the user's info in the user profile info section
   */
  function displayUserInfo() {
    const name = currentUser.name;
    const username = currentUser.username;
    const account_date = currentUser.createdAt;
    $("#profile-name").text(`Name: ${name}`);
    $("#profile-username").text(`Username: ${username}`);
    $("#profile-account-date").text(`Account Created: ${account_date}`);
    $userProfileInfo.show();
  }

  /**
   * A rendering function to call the StoryList.getStories static method, which
   * will generate a storyListInstance. Then render it.
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    if (!storyList) {
      return;
    }
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   * @param {Object{string}} story The story to render
   * @return the HTML for the story
   */
  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        <i class="fas fa-heart"></i>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * A rendering function to add all favorite stories to the favorites section
   */
  function generateFavorites() {
    const $favoritedArticlesContainer = $("#favorited-articles-container");
    const $favoritedArticles = $("#favorited-articles");

    // if no favorite stories, don't show favorites section
    if (!currentUser || currentUser.favorites.length === 0) {
      $favoritedArticlesContainer.hide();
      return;
    }

    // clear the favorites section
    $favoritedArticles.empty();

    // render all of current user's favorite stories
    for (let story of currentUser.favorites) {
      const result = generateFavoriteHTML(story);
      $favoritedArticles.append(result);
    }
    $favoritedArticlesContainer.show();
  }

  /**
   * A function to render HTML for a favorite story of the current user.
   * @param {Object{string}} story The story to render
   * @return the HTML for the story
   */
  function generateFavoriteHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="favorite-${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        <i class="fas fa-times-circle"></i>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * A rendering function to add all my stories to the my articles section
   */
  function generateMyStories() {
    const $ownStoriesContainer = $("#my-articles-container");

    // if no favorite stories, don't show favorites section
    if (!currentUser || currentUser.ownStories.length === 0) {
      $ownStoriesContainer.hide();
      return;
    }

    // clear the favorites section
    $ownStories.empty();

    // render all of current user's favorite stories
    for (let story of currentUser.ownStories) {
      const result = generateMyStoriesHTML(story);
      $ownStories.append(result);
    }
    $ownStoriesContainer.show();
    $ownStories.show();
  }

  /**
   * A function to render HTML for a story created by the current user
   * @param {Object{string}} story The story to render
   * @return the HTML for the story
   */

  function generateMyStoriesHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="my-article-${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        <i class="fas fa-times-circle"></i>
        <button class="edit-button">Edit</button>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * Hides all elements in elementsArr
   */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfileInfo
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  /**
   * Replace login link with logout link
   */
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
  }

  /**
   * Simple function to pull the hostname from a URL
   * @param {string} url The URL to extract the hostname from
   * @return the hostname
   */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /**
   * Sync current user information to localStorage
   */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
