import {
    ActivityIndicator,
    Button,
    ScrollView,
    Text,
    View,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();
const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
});

// Keycloak details
const keycloakUri = "http://192.168.1.145:8085";
const keycloakRealm = "myrealm";
const clientId = "react-native-client";

export function generateShortUUID() {
    return Math.random().toString(36).substring(2, 15);
}

export default function App() {
    const [accessToken, setAccessToken] = useState();
    const [idToken, setIdToken] = useState();
    const [refreshToken, setRefreshToken] = useState();
    const [discoveryResult, setDiscoveryResult] =
        useState();

    // Fetch OIDC discovery document once
    useEffect(() => {
        const getDiscoveryDocument = async () => {
            const discoveryDocument = await AuthSession.fetchDiscoveryAsync(
                `${keycloakUri}/realms/${keycloakRealm}`
            );
            setDiscoveryResult(discoveryDocument);
        };
        console.log("discoveryResult: ", discoveryResult);
        getDiscoveryDocument();
    }, []);

    const login = async () => {
        const state = generateShortUUID();
        // Get Authorization code
        const authRequestOptions = {
            responseType: AuthSession.ResponseType.Code,
            clientId,
            redirectUri: redirectUri,
            prompt: AuthSession.Prompt.Login,
            scopes: ["openid", "profile", "email", "offline_access"],
            state: state,
            usePKCE: true,
        };
        const authRequest = new AuthSession.AuthRequest(authRequestOptions);
        const authorizeResult = await authRequest.promptAsync(discoveryResult, {
            useProxy: true,
        });

        if (authorizeResult.type === "success") {
            // If successful, get tokens
            const tokenResult = await AuthSession.exchangeCodeAsync(
                {
                    code: authorizeResult.params.code,
                    clientId: clientId,
                    redirectUri: redirectUri,
                    extraParams: {
                        code_verifier: authRequest.codeVerifier || "",
                    },
                },
                discoveryResult
            );

            setAccessToken(tokenResult.accessToken);
            setIdToken(tokenResult.idToken);
            setRefreshToken(tokenResult.refreshToken);
        }
    };

    const refresh = async () => {
        const refreshTokenObject = {
            clientId: clientId,
            refreshToken: refreshToken,
        };
        const tokenResult = await AuthSession.refreshAsync(
            refreshTokenObject,
            discoveryResult
        );

        setAccessToken(tokenResult.accessToken);
        setIdToken(tokenResult.idToken);
        setRefreshToken(tokenResult.refreshToken);
    };

    const logout = async () => {
        if (!accessToken) return;
        const redirectUrl = AuthSession.makeRedirectUri({ useProxy: false });
        const revoked = await AuthSession.revokeAsync(
            { token: accessToken },
            discoveryResult
        );
        if (!revoked) return;

        // The default revokeAsync method doesn't work for Keycloak, we need to explicitely invoke the OIDC endSessionEndpoint with the correct parameters
        const logoutUrl = `${discoveryResult
            .endSessionEndpoint}?client_id=${clientId}&post_logout_redirect_uri=${redirectUrl}&id_token_hint=${idToken}`;
        //  http://192.168.1.145:8085/realms/myrealm/protocol/openid-connect/logout?client_id=react-native-client&post_logout_redirect_uri=exp://192.168.1.145:8081&id_token_hint=eyJhb

        const res = await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUrl);
        if (res.type === "success") {
            setAccessToken(undefined);
            setIdToken(undefined);
            setRefreshToken(undefined);
        }
    };

    const userinfo = async () => {
        if (!accessToken) return;
        const redirectUrl = AuthSession.makeRedirectUri({ useProxy: false });
        const userInfoUrl = `http://192.168.1.145:8085/realms/myrealm/account/?referrer=${clientId}&referrer_uri=${redirectUrl}`;
        const res = await WebBrowser.openAuthSessionAsync(userInfoUrl, redirectUrl);
        if (res.type === "success") {
            setAccessToken(undefined);
            setIdToken(undefined);
            setRefreshToken(undefined);
        }
    };

    const register = async () => {
        const redirectUrl = AuthSession.makeRedirectUri({ useProxy: false });
        const registrationUrl = `${keycloakUri}/realms/${keycloakRealm}/protocol/openid-connect/registrations?client_id=${clientId}&redirect_uri=${redirectUrl}&response_mode=fragment&response_type=code&scope=openid`;
        const res = await WebBrowser.openAuthSessionAsync(registrationUrl, redirectUrl);
        if (res.type === "success") {
            setAccessToken(undefined);
            setIdToken(undefined);
            setRefreshToken(undefined);
            setTimeout(() => {
                login();
            }, 100);
        }
    };

    if (!discoveryResult) return <ActivityIndicator />;

    if(accessToken){
        console.log("accessToken: ", accessToken);
    }

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            {refreshToken ? (
                <View
                    style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                >
                    {/*<View>*/}
                    {/*    <ScrollView style={{ flex: 1 }}>*/}
                    {/*        <Text>AccessToken: {accessToken}</Text>*/}
                    {/*        <Text>idToken: {idToken}</Text>*/}
                    {/*        <Text>refreshToken: {refreshToken}</Text>*/}
                    {/*    </ScrollView>*/}
                    {/*</View>*/}
                    <View>
                        <Button title="Refresh" onPress={refresh} />
                        <Button title="User Info" onPress={userinfo} />
                        <Button title="Logout" onPress={logout} />
                    </View>
                </View>
            ) : (
                <>
                    <Button title="Login" onPress={login} />
                    <Button title="Register" onPress={register} />
                </>
            )}
        </View>
    );
}