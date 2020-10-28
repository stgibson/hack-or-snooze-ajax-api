const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances. It also has
 * some methods for fetching, adding, and removing stories.
 */
class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList. Method
   * is static since it should return the same thing for any user.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   * @return the StoryList instance
   */
  static async getStories() {
    try {
      // query the /stories endpoint (no auth required)
      const response = await axios.get(`${BASE_URL}/stories`);

      // turn the story objects from the API into instances of the Story class
      const stories = response.data.stories.map(story => new Story(story));

      // build an instance of our own class using the new array of stories
      const storyList = new StoryList(stories);
      return storyList;
    }
    catch(e) {
      alert("Cannot get stories");
      return null;
    }
  }

  /**
   * Method to make a POST request to /stories and add the new story to the
   * list
   * @param {Object} user the current instance of User who will post the story
   * @param {Object{string}} newStory a new story object for the API with
   * title, author, and url
   * @return the new story object
   */
  async addStory(user, newStory) {
    const body = {
      "token": user.loginToken,
      "story": newStory
    };
    try {
      const response = await axios.post(`${BASE_URL}/stories`, body);
      return response.data.story;
    }
    catch(e) {
      alert("Could not add story");
      return null;
    }
  }

  /**
   * Method to make a PATCH request to /stories to edit a story
   * @param {Object} user the current instance of User who edited the story
   * @param {string} storyId the ID of the story to edit
   * @param {Object{string}} newStory the new data to replace story with
   * @return the new story object
   */
  async editStory(user, storyId, newStory) {
    const url = `${BASE_URL}/stories/${storyId}`;
    const body = {
      "token": user.loginToken,
      "story": newStory
    }
    try {
      const response = await axios.patch(url, body);
      return response.data.story;
    }
    catch(e) {
      alert("Could not edit story")
      return null;
    }
  }

  /**
   * Method to make a DELETE request to /stories to delete the story with ID
   * storyId.
   * @param {Object} user The user who created the story
   * @param {string} storyId ID of the story to delete
   */
  async removeStory(user, storyId) {
    const data = {
      "token": user.loginToken
    };
    try {
      await axios.delete(`${BASE_URL}/stories/${storyId}`, { data });
    }
    catch(e) {
      alert("Could not delete story");
    }
  }
}


/**
 * The User class to primarily represent the current user. There are helper
 * methods to signup (create), login, and getLoggedInUser.
 */
class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /**
   * Create and return a new user. Makes POST request to API and returns newly-
   * created user.
   * @param {string} username A new username
   * @param {string} password A new password
   * @param {string} name The user's full name
   * @return The new user
   */
  static async create(username, password, name) {
    try {
      const response = await axios.post(`${BASE_URL}/signup`, {
        user: {
          username,
          password,
          name
        }
      });
  
      // build a new User instance from the API response
      const newUser = new User(response.data.user);
  
      // attach the token to the newUser instance for convenience
      newUser.loginToken = response.data.token;
  
      return newUser;
    }
    catch(e) {
      alert("Couldn't sign you up");
      return null;
    }
  }

  /** 
   * Login in user and return user instance.
   * @param {string} username An existing user's username
   * @param {string} password An existing user's password
   * @return The user
   */
  static async login(username, password) {
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        user: {
          username,
          password
        }
      });
  
      // build a new User instance from the API response
      const existingUser = new User(response.data.user);
  
      // instantiate Story instances for the user's favorites and ownStories
      existingUser.favorites =
        response.data.user.favorites.map(s => new Story(s));
      existingUser.ownStories =
        response.data.user.stories.map(s => new Story(s));
  
      // attach the token to the newUser instance for convenience
      existingUser.loginToken = response.data.token;
  
      return existingUser;
    }
    catch(e) {
      alert("Couldn't log you in");
      return null;
    }
  }

  /**
   * Get user instance for the logged-in-user. This function uses the token &
   * username to make an API request to get details about the user. Then it
   * creates an instance of user with that info.
   * @param {string} token The user's authentication token
   * @param {string} username The user's username
   * @return The user
   */
  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    try {
      // call the API
      const response = await axios.get(`${BASE_URL}/users/${username}`, {
        params: {
          token
        }
      });

      // instantiate the user from the API information
      const existingUser = new User(response.data.user);

      // attach the token to the newUser instance for convenience
      existingUser.loginToken = token;

      // instantiate Story instances for the user's favorites and ownStories
      existingUser.favorites =
        response.data.user.favorites.map(s => new Story(s));
      existingUser.ownStories =
        response.data.user.stories.map(s => new Story(s));
      return existingUser;
    }
    catch(e) {
      alert("Could not get your information");
      return null;
    }
  }

  /**
   * Adds story to ownStories
   * @param {Object{string}} story The story to add
   */
  addStory(story) {
    this.ownStories.push(story);
  }

  /**
   * Get story with ID storyId from ownStories
   * @param {string} storyId The ID of the story to get
   * @return the story, or null if it isn't in ownStories
   */
  getStoryById(storyId) {
    return this.ownStories.find(story => story.storyId === storyId);
  }

  /**
   * Edit story in favorites and ownStories
   * @param {Object{string}} story The new data for the story
   */
  editStory(story) {
    const favoritesStoryIndex = this.favorites.findIndex(s => {
      return s.storyId === story.storyId;
    });
    if (favoritesStoryIndex !== -1) {
      this.favorites[favoritesStoryIndex] = story;
    }

    const ownStoriesStoryIndex = this.ownStories.findIndex(s => {
      return s.storyId === story.storyId;
    });
    if (ownStoriesStoryIndex !== -1) {
      this.ownStories[ownStoriesStoryIndex] = story;
    }
  }

  /**
   * Removes story with ID storyId from favorites and ownStories
   * @param {string} storyId The ID of the story to remove
   */
  removeStory(storyId) {
    this.favorites = this.favorites.filter(story => {
      return story.storyId !== storyId;
    });

    this.ownStories = this.ownStories.filter(story => {
      return story.storyId !== storyId;
    });
  }

  /**
   * Add story with ID storyId to favorites for the user.
   * @param {string} storyId ID of story to add to favorites
   */
  async like(storyId) {
    // if already a favorite, do nothing
    if (this.favorites.some(story => story.storyId === storyId)) {
      return;
    }
    const url = `${BASE_URL}/users/${this.username}/favorites/${storyId}`;
    const body = {
      "token": this.loginToken
    };
    try {
      const response = await axios.post(url, body);
      this.favorites = response.data.user.favorites.map(s => new Story(s));
    }
    catch(e) {
      alert("Could not add story to favorites");
    }
  }
  
  /**
   * Remove story with ID storyId from favorites for the user.
   * @param {string} storyId ID of story to un-favorite
   */
  async unlike(storyId) {
    const url = `${BASE_URL}/users/${this.username}/favorites/${storyId}`;
    const data = {
      "token": this.loginToken
    };
    try {
      const response = await axios.delete(url, { data });
      this.favorites = response.data.user.favorites.map(s => new Story(s));
    }
    catch (e) {
      alert("Could not remove story from favorites");
    }
  }
}

/**
 * Class to represent a single story
 */
class Story {
  /**
   * The constructor is designed to take an object for better readability /
   * flexibility
   * @param {Object{string}} storyObj An object that has story properties in it
   */
  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}