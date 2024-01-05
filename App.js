import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, useAutoDiscovery } from 'expo-auth-session';
import { Button, Text, View } from 'react-native';
import axios from 'axios';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
    const discovery = useAutoDiscovery('http://192.168.1.145:8085/realms/myrealm');

    // Development Build: my-scheme://redirect
    // Expo Go: exp://192.168.1.145:8081
    const [request, result, promptAsync] = useAuthRequest(
        {
            clientId: 'react-native-client',
            redirectUri: makeRedirectUri({
                // scheme: 'rajiv'
            }),
            scopes: ['openid', 'profile'],
        },
        discovery
    );

    async function getToken(code) {
        const tokenEndpoint = 'http://192.168.1.145:8085/realms/myrealm/protocol/openid-connect/token';
        const payload = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'exp://192.168.1.145:8081',
            client_id: 'react-native-client',
            // client_secret: 'YOUR_CLIENT_SECRET'
        };

        try {
            const response = await axios.post(tokenEndpoint, JSON.stringify(payload), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });


            console.log("RAJIV", response)
            return response.data; // This contains the JWT token
        } catch (error) {
            console.error('Error fetching token:', error);
        }
    }

    if(result) {
        getToken(result.params.code);
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Button title="Login!" disabled={!request} onPress={() => promptAsync()} />
            {result && <Text>{JSON.stringify(result, null, 2)}</Text>}
        </View>
    );
}
