import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

/**
 * RealmStatusDisplay component fetches and displays the status of World of Warcraft realms.
 * It provides sorting functionality for realm data.
 *
 * @param {object} props - The component props.
 * @param {string} props.region - The region for which to fetch realm status (e.g., "eu", "us").
 * @param {object} props.config - Configuration object containing API base URL, namespace, and locale.
 * @param {string} props.ACCESS_TOKEN - The authentication token required for API calls.
 */
function RealmStatusDisplay({ region, config, ACCESS_TOKEN }) {
    const [allRealmsForDisplay, setAllRealmsForDisplay] = useState(null);   // State to store the flattened array of realm data ready for display.
    const [isLoading, setIsLoading] = useState(true);                       // State to indicate if data is currently being fetched (true when fetching, false otherwise).
    const [error, setError] = useState(null);                               // State to store any error message that occurs during data fetching, null if no error.
    const [sortDirection, setSortDirection] = useState('asc');              // State to control the sorting direction ('asc' for ascending, 'desc' for descending).
    const [sortColumn, setSortColumn] = useState(null);                     // State to store the column currently being sorted by.

    // useEffect hook to fetch realm data when the component mounts or when
    // 'region', 'config', or 'ACCESS_TOKEN' props change.
    useEffect(() => {
        const fetchRealmData = async () => {
            setIsLoading(true);
            setError(null);

            // If no access token is provided, set an error and stop loading.
            if (!ACCESS_TOKEN) {
                setError("Authentication token not available.");
                setIsLoading(false);
                return;
            }

            try {
                // Step 1: Fetch the list of all connected realm IDs from the API.
                const indexUrl = `${config.baseUrl}/data/wow/connected-realm/index?namespace=${config.namespace}&locale=${config.locale}`;
                const indexResponse = await axios.get(indexUrl, {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`
                    }
                });

                // Step 2: Extract connected realm IDs from the 'href' property of each realm.
                const connectedRealmIds = indexResponse.data.connected_realms.map(realm => {
                    const urlParts = realm.href.split('/');
                    const idWithQuery = urlParts[urlParts.length - 1];
                    return idWithQuery.split('?')[0];
                });

                // Step 3: Fetch detailed status for each connected realm with throttling.
                // Throttling (with a 50ms delay) is implemented to prevent hitting API rate limits (e.g., 429 errors).
                const allConnectedRealmStatuses = [];
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                for (const id of connectedRealmIds) {
                    try {
                        const statusUrl = `${config.baseUrl}/data/wow/connected-realm/${id}?namespace=${config.namespace}&locale=${config.locale}`;
                        const response = await axios.get(statusUrl, {
                            headers: {
                                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                            },
                        })
                        allConnectedRealmStatuses.push(response.data);
                        await delay(50);
                    } catch (individualError) {
                        console.warn(`Could not fetch status for connected realm ID ${id}:`, individualError.response ? individualError.response.data : individualError.message);
                    }
                }

                // Step 4: Process the fetched connected realm data and flatten it into a displayable format.
                const flattenedRealms = [];
                allConnectedRealmStatuses.forEach(connectedRealm => {
                    if (connectedRealm.realms && Array.isArray(connectedRealm.realms)) {
                        connectedRealm.realms.forEach(individualRealm => {
                            flattenedRealms.push({
                                connectedRealmId: connectedRealm.id,
                                realmName: individualRealm.name,
                                statusType: connectedRealm.status.type,
                                statusName: connectedRealm.status.name,
                                populationType: connectedRealm.population.type,
                                populationName: connectedRealm.population.name,
                                hasQueue: connectedRealm.has_queue,
                                realmType: individualRealm.type.name
                            });
                        });
                    }
                });

                // Update the state with the flattened realm data.
                setAllRealmsForDisplay(flattenedRealms);

            } catch (err) {
                // Catch any errors that occur during the main API calls and set an error message.
                console.error(`Error fetching ${region} realm status:`, err);
                setError(`Failed to load ${region} realm status. Please check your network or API token. Error: ${err.message}`);
            } finally {
                // Always set isLoading to false once fetching is complete, regardless of success or failure.
                setIsLoading(false);
            }
        }

        fetchRealmData();

        // Cleanup function (runs when the component unmounts or before the effect re-runs).
        // In this case, there's no specific cleanup needed for this effect.
        return () => {

        };

    }, [region, config, ACCESS_TOKEN]); // Dependency array: The effect will re-run if any of these values change.

    /**
     * Handles sorting when a table header is clicked.
     * Toggles the sort direction if the same column is clicked again, otherwise sorts ascending.
     * @param {string} column - The name of the column to sort by.
     */
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // useMemo hook to memoize the sorted realms array.
    // This prevents re-sorting the data unnecessarily on every render if
    // allRealmsForDisplay, sortColumn, or sortDirection haven't changed.
    const sortedRealms = useMemo(() => {
        // If there's no data to display, return an empty array.
        if (!allRealmsForDisplay) return [];

        // Create a shallow copy of the array to sort, to avoid mutating the original state.
        const sortableRealms = [...allRealmsForDisplay];

        if (sortColumn) {
            sortableRealms.sort((a, b) => {
                let valueA = a[sortColumn];
                let valueB = b[sortColumn];

                // Custom sorting logic for 'statusName': 'UP' comes before 'DOWN'.
                if (sortColumn === 'statusName') {
                    valueA = a.statusType === 'UP' ? 1 : 0;
                    valueB = b.statusType === 'UP' ? 1 : 0;
                }
                // Custom sorting logic for 'populationName': 'HIGH' > 'MEDIUM' > 'LOW' > 'FULL'.
                else if (sortColumn === 'populationName') {
                    const populationOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'FULL': 4 }; // Assign numerical values
                    valueA = populationOrder[a.populationType] || 0; // Default to 0 for unknown
                    valueB = populationOrder[b.populationType] || 0;
                }
                // Default comparison for other columns (case-insensitive for strings).
                else {
                    if (typeof valueA === 'string' && typeof valueB === 'string') {
                        valueA = valueA.toLowerCase();
                        valueB = valueB.toLowerCase();
                    }
                }

                // Perform the actual comparison based on sort direction.
                if (valueA < valueB) {
                    return sortDirection === 'asc' ? -1 : 1;
                }
                if (valueA > valueB) {
                    return sortDirection === 'asc' ? 1 : -1;
                }
                return 0; // Values are equal
            });
        }
        return sortableRealms;
    }, [allRealmsForDisplay, sortColumn, sortDirection]);

    return (
        <div className="content">
            {/* Conditionally render a loading message (progress bar) */}
            {isLoading && (
                <progress className="progress is-small is-primary" max="100">Loading...</progress>
            )}


            {/* Conditionally render an error message */}
            {error && (
                <div className="notification is-danger">
                    <button className="delete" onClick={() => setError(null)}></button>
                    {error}
                </div>
            )}

            {/* Conditionally render the realm status table only when not loading, no error, and data is available */}
            {!isLoading && !error && allRealmsForDisplay && (
                <>
                    <table className="table is-striped is-hoverable is-fullwidth">
                        <thead>
                            <tr>
                                {/* Clickable table headers for sorting */}
                                <th onClick={() => handleSort('realmName')} style={{ cursor: 'pointer' }}>
                                    Realm Name {sortColumn === 'realmName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('statusName')} style={{ cursor: 'pointer' }}>
                                    Status {sortColumn === 'statusName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('populationName')} style={{ cursor: 'pointer' }}>
                                    Population {sortColumn === 'populationName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('realmType')} style={{ cursor: 'pointer' }}>
                                    Type {sortColumn === 'realmType' && (sortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th>Queue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Check if there are realms to display */}
                            {allRealmsForDisplay.length > 0 ? (
                                // Map over the sortedRealms array to render each realm row
                                sortedRealms.map((realm, index) => (
                                    <tr key={`${realm.connectedRealmId}-${realm.realmName}-${index}`}>
                                        <td><strong>{realm.realmName}</strong></td>
                                        <td>
                                            {/* Apply success/danger text color based on statusType */}
                                            <span className={`has-text-${realm.statusType === 'UP' ? 'success' : 'danger'}`}>
                                                {realm.statusName}
                                            </span>
                                        </td>
                                        <td>
                                            {/* Apply different text colors based on population type */}
                                            <span className={`is-capitalized has-text-${realm.populationType === 'HIGH' ? 'danger' :
                                                realm.populationType === 'MEDIUM' ? 'warning' : 'info'
                                                }`}>
                                                {realm.populationName}
                                            </span>
                                        </td>
                                        <td>
                                            {realm.realmType}
                                        </td>
                                        <td>
                                            {/* Display 'Yes' with a warning tag if there's a queue, otherwise 'No' */}
                                            {realm.hasQueue ? (
                                                <span className="tag is-warning is-light">Yes</span>
                                            ) : (
                                                <span>No</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                // Display a message if no individual realms are found.
                                <tr>
                                    <td colSpan="5" className="has-text-centered">No individual realms found for this region.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </>
            )}
            {/* Display a message if not loading, no error, and no realm data available */}
            {!isLoading && !error && !allRealmsForDisplay && (
                <p className="has-text-warning">No realm status data available for {region}.</p>
            )}
        </div>
    );
}

export default RealmStatusDisplay;