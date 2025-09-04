import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error("AWS credentials are not set in environment variables.");
    }
    const client = new DynamoDBClient({
        region: "ap-northeast-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
    const command = new ListTablesCommand({});

    const response = await client.send(command);
    if (response.TableNames) {
        console.log(response.TableNames.join("\n"));
        return NextResponse.json(response.TableNames.join("\n"));
    } else {
        console.log("No tables found.");
    }
    return NextResponse.json(response);

}

