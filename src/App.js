import "./App.css";
import { DataStore } from "@aws-amplify/datastore";
import React, { useEffect, useState } from "react";
import { Challenges, User } from "./models";
import { withAuthenticator, AmplifySignOut } from "@aws-amplify/ui-react";
import awsconfig from "./aws-exports";
import Amplify, { Hub, Auth } from "aws-amplify";

Amplify.configure(awsconfig);
let challenges;
let mainData;

async function test() {
	//first clear the local database
	//await DataStore.clear();

	//Create an array with different strings
	mainData = ["ch1", "ch2", "ch3", "ch4"];
	challenges = [...mainData];

	//query all the data, and store it in the variable notes
	//Note that we have a 5 seconds delay. This is required if data is being upload to the cloud before we query. That way the Datastore.save() function has time to upload the data.
	let notes;
	//let loader = setTimeout(async () => {
	try {
		notes = await DataStore.query(Challenges);
		console.log("Here are the notes!", JSON.stringify(notes));
	} catch (error) {
		console.log("There was a problem with querying", error);
	}
	//}, 5 * 1000);
	// return () => {
	//   clearTimeout(loader);
	// };

	//loop through the entire array we got from the querying the notes table
	notes.forEach((item) => {
		console.log(item.content);
		let skip = false; //used to handle last element edge case

		for (let i = 0; i < challenges.length; i++) {
			//if the database item is in the challenges array then remove it from the challegnes array, and stop the loop
			//should also not allow duplicates
			if (item.content === challenges[i]) {
				challenges.splice(i, 1);
				//console.log(challenges);
				if (challenges.length === 0) {
					skip = true;
				}
				break;
			}

			//if we're on the last iteration, and the loop hasn't stopped then go ahead, and delete the database item.
			if (i === challenges.length - 1) {
				databaseDelete(item);
			}
		}

		//If the challenges array have a length of zero then that means everything else in the database can be deleted since its either a duplicate, or the item was removed.
		if (challenges.length === 0 && skip !== true) {
			databaseDelete(item);
		}

		skip = false;
	});

	uploadNewChallenges(challenges);
	//DataStore.start();
}

//Now we need to add the remaining challeges from the array into the database
async function uploadNewChallenges(challenges) {
	for (let i = 0; i < challenges.length; i++) {
		try {
			await DataStore.save(
				new Challenges({
					content: challenges[i],
				})
			);
		} catch (error) {
			console.log("Error saving post", error);
		}
	}
}

function databaseDelete(item) {
	console.log("This is what I am deleting", item.content);
	DataStore.delete(item);
}

async function checkUserTable(user, challenges) {
	let userEmail = user.attributes.email;
	console.log("USER MAIL", userEmail);
	try {
		let info = await DataStore.query(User, (c) =>
			c.email("contains", userEmail)
		);
		console.log("Here are the notes!", JSON.stringify(info));
		if (info.length === 0) {
			await DataStore.save(
				new User({
					email: userEmail,
					challenges: challenges,
				})
			);
		}
	} catch (error) {
		console.log("There was a problem with querying", error);
	}
}

function App() {
	const [currentUser, setCurrentUser] = useState();

	useEffect(() => {
		//console.log("in use effect!");
		test();

		let updateUser = async (authState) => {
			try {
				let user = await Auth.currentAuthenticatedUser();
				setCurrentUser(user);
				checkUserTable(user, challenges);
			} catch {
				setCurrentUser(null);
			}
		};

		Hub.listen("auth", updateUser);
		updateUser();
		return () => {
			Hub.remove("auth", updateUser);
		};
	}, []);

	return (
		<div>
			<AmplifySignOut />
			<h1>Hello!</h1>
		</div>
	);
}

export default withAuthenticator(App);
