DATABASE SIDE
1. Install node JS and Mongo DB.
2. Download the code.
3. Go to the directory of database.
4. Write the Command: node index.js
5. Try accessing localhost:3001/save with json file name via POSTMAN
Example of Json File: 
{
    "MacAddress" : "kk:ee:55:51:3A:AA",
	"ArrayOfSessions" : [{
		"StartTime" : "2020-01-01 00:00:01",
		"EndTime" : "2020-01-01 00:00:03",
		"ArrayOfRecords" : [{
					"TimeStamp" : "2020-01-01 00:00:02",
					"Latitude" : 4.981173,
					"Longitude" : 120.826965,
					"Heading" : 2.0,
					"Speed" : 2.0
				},
				{
					"TimeStamp" : "2020-02-01 00:00:02",
					"Latitude" : 5.138030,
					"Longitude" : 121.068664,
					"Heading" : 2.0,
					"Speed" : 2.0
				},
				{
					"TimeStamp" : "2020-01-01 00:00:02",
					"Latitude" : 5.455273,
					"Longitude" : 121.519103,
					"Heading" : 2.0,
					"Speed" : 2.0
				}
				],
		"ArrayOfCatches" : [{
					"TimeStamp" : "2020-01-01 00:00:02",
					"Latitude" : 4.981173,
					"Longitude" : 120.826965,
					"RelatedPhoto" : "filename1.jpg"
					},
					{
					"TimeStamp" : "2020-01-01 00:00:02",
					"Latitude" :5.138030,
					"Longitude" : 121.068664,
					"RelatedPhoto" : "filename2.jpg"
					},
					{
					"TimeStamp" : "2020-01-01 00:00:02",
					"Latitude" :5.455273,
					"Longitude" : 121.519103,
					"RelatedPhoto" : "filename3.jpg"
					}]
		}]
}

Name of the Database: Logs
Port: 3001

