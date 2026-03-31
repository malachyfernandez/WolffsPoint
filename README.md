# Example Project

A modern React Native application built with Expo, Convex backend, and Clerk authentication. Example Project provides a seamless mobile experience with real-time data synchronization and secure user management.

---

## Requirements

- **Node.js** (LTS recommended, e.g. 20.x)
- **npm** (comes with Node)
- **Git**
- Expo tooling will be installed as part of `npm install`.

---

## Getting started (using this repo directly)

1. **Clone the repo**

   ```bash
   git clone https://github.com/malachyfernandez/exampleProject.git
   cd exampleProject
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the app**

   Available scripts (from `package.json`):

   - Start Metro / Expo dev server:

     ```bash
     npm run start
     ```

   - Run on Android (device or emulator):

     ```bash
     npm run android
     ```

   - Run on iOS (simulator):

     ```bash
     npm run ios
     ```

   - Run on the web (Expo web):

     ```bash
     npm run web
     ```

   Follow the Expo CLI instructions in your terminal to open on your target platform.

---

## Using this as a **base** for a new project

Whenever you want to start a new app based on this setup:

1. **Clone into a new folder**

   ```bash
   git clone https://github.com/malachyfernandez/exampleProject.git my-new-app
   cd my-new-app
   ```

2. **(Optional but recommended) Remove this repo's git history and start fresh**

   ```bash
   rm -rf .git
   git init
   git add .
   git commit -m "Initial commit for my-new-app"
   ```

   At this point, `my-new-app` is its **own** git repository, separate from the base.

3. **Install dependencies and run**

   ```bash
   npm install
   npm run start    # or npm run android / ios / web
   ```

4. **(Optional) Create a new GitHub repo for the new app**

   - Create a new, empty repo on GitHub.
   - Then connect your local project to it:

     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO.git
     git branch -M main
     git push -u origin main
     ```

---

## Project identity / naming

Internally, the project uses the technical name:

- `exampleProject`

This is used for things like `package.json` and the Expo slug.

If you create a new project from this base, you can edit:

- `package.json` → `name`
- `app.json` → `expo.name`, `expo.slug`, and `expo.ios.bundleIdentifier`

To match your new app's branding.


