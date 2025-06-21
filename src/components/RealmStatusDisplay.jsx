import { useState, useEffect } from 'react';

function RealmStatusDisplay({ region, config, ACCESS_TOKEN }) {
    const [realms, setRealms] = useState([]);       // Stores the array of realm data
    const [loading, setLoading] = useState(true);   // True when fetching, false otherwise
    const [error, setError] = useState(null);       // Stores any error message, null if no error
    const [connectedRealmOverallStatus, setConnectedRealmOverallStatus] = useState(null);

    // This effect will run after the first render, and then whenever
    // the 'region', 'config', or 'ACCESS_TOKEN' props change.
    useEffect(() => {
        async function fetchRealmData() {
            setLoading(true);
            setError(null);

            try {
                // Step 1: Get Realm Index and Connected Realm ID
                const connectedRealmUrl = `${config.baseUrl}/data/wow/connected-realm/index?namespace=${config.namespace}&locale=${config.locale}`;
                const connectedRealmResponse = await fetch(connectedRealmUrl, {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`
                    }
                });

                if (!connectedRealmResponse.ok) {
                    throw new Error(`HTTP error for ${region} connected realm index! Status: ${connectedRealmResponse.status} - ${connectedRealmResponse.statusText}`);
                }

                const connectedRealmData = await connectedRealmResponse.json();

                // Step 2: Gets the status for the realm
                let connectedRealmID = null;
                // Checks if the call to the API returned an array of realms
                // that isn't empty.
                if (connectedRealmData.connected_realms && connectedRealmData.connected_realms.length > 0) {
                    // Gets the first realm from the array, splits it into sections based on the '/',
                    // trims any parameters, and gets the ID.
                    const firstConnectedRealm = connectedRealmData.connected_realms[0];
                    const firstHref = firstConnectedRealm.href;
                    const parts = firstHref.split('/');
                    const connectedRealmID = parts[parts.length - 1].split('?')[0];

                    // Contructs the URL for the second API query, that will return the status
                    // then fetches the data and stores it, ready for processing.
                    const connectedRealmStatusURL = `${config.baseUrl}/data/wow/connected-realm/${connectedRealmID}?namespace=${config.namespace}&locale=${config.locale}`;
                    const statusResponse = await fetch(connectedRealmStatusURL, {
                        headers: {
                            'Authorization': `Bearer ${ACCESS_TOKEN}`
                        }
                    });

                    if (!statusResponse.ok) {
                        throw new Error(`HTTP error fetching connected realm status! Status: ${statusResponse.status} - ${statusResponse.statusText}`);
                    }

                    const statusData = await statusResponse.json();
                    console.log(statusData);
                    console.log(statusData.realms);

                    setConnectedRealmOverallStatus({
                        status: statusData.status.type,
                        population: statusData.population.type
                    });

                    if (statusData.realms && statusData.realms.length > 0) {
                        setRealms(statusData.realms);
                    } else {
                        setRealms([]); // Ensure it's an empty array if no realms found
                        setError(`No detailed realm list found for connected realm ID ${connectedRealmId}.`);
                    }

                } else {
                    setError("No connected realms found.")
                    setLoading(false);
                    return;
                }

            } catch (err) {
                console.error(`Error fetching ${region} realm status:`, err);
                setError(`Failed to load ${region} realm status. Please check your network or API token. Error: ${err.message}`);
            } finally {
                setLoading(false);
            }

        }

        fetchRealmData();

        // This function is returned by the effect, and it runs when the component
        // unmounts or before the effect re-runs (useful for cleanup).
        return () => {

        };

    }, [region, config, ACCESS_TOKEN]); // Dependency array: Effect re-runs if any of these values change

    return (
        <div className="content">
            <h3 className="title is-4">Connected Realm Status for {region}:</h3>

            {/* Conditionally render a loading message */}
            {loading && <p className="has-text-info">Loading {region} realm data...</p>}

            {/* Conditionally render an error message */}
            {error && (
                <article className="message is-danger">
                    <div className="message-body">
                        {error}
                    </div>
                </article>
            )}

            {connectedRealmOverallStatus && (
                <p>Overall Group Status: <span className="is-capitalized">{connectedRealmOverallStatus.status.toLowerCase()}</span> | Population: <span className="is-capitalized">{connectedRealmOverallStatus.population.toLowerCase()}</span></p>
            )}

            {/* Conditionally render the realm status if NOT loading, NO error, AND have data. */}
            {!loading && !error && realms.length > 0 && (
                <table className="table is-striped is-hoverabled is-fullwidth">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Realm Name</th>
                            <th>Population</th>
                        </tr>
                    </thead>
                    <tbody>
                        {realms.map((realm, index) => (
                            <tr key={index}>
                                <td>
                                    <span style={{ color: connectedRealmOverallStatus?.status === 'UP' ? 'green' : 'red' }}>
                                        {connectedRealmOverallStatus?.status === 'UP' ? <>Up</> : <>Down</>}
                                    </span>
                                </td>
                                <td><strong>{realm.name}</strong></td>
                                <td><span className="is-capitalized">{connectedRealmOverallStatus?.population.toLowerCase()}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {!loading && !error && realms.length === 0 && (
                <p className="has-text-warning">No realm status data available for {region}.</p>
            )}
        </div>
    );
}

export default RealmStatusDisplay;