import { ReactNode, useEffect, useState } from "react";
import ToroHeyyy from "./../assets/toro_heyyy.png";

const apiPath = '/api/v1/entries';
const apiUrl = window.location.origin + apiPath;

export default function AdminPage() {
    const [entries, setEntries] = useState(new Map<string, string>);
    useEffect(() => {
        fetch(apiUrl).then(response => {
            if (!response.ok) {
                throw new Error(`network response failed from url ${apiUrl}`);
            }

            return response.json()
        }).then(jsonResponse => {
            const data: Map<string, string> = new Map(Object.entries(jsonResponse['data']));
            setEntries(data)
        }).catch(error => {
            console.error(`api call failed: ${error}`)
        });
    }, [])

    let entryList: JSX.Element[] = [];
        entries.forEach((value, key) => {
            entryList.push(
                <tr className="table-element">
                    <td>
                        <div className="table-element">{key}</div>
                    </td>
                    <td>
                        <div className="table-element">{value}</div>
                    </td>
                </tr>
        )

    })

    return(
         <div className="center">
            <img src={ToroHeyyy}></img>
            <EntriesList></EntriesList>

            <div>
                <button type="button" className="nes-btn" id="add-entry-button">add entry</button>
                <button type="button" className="nes-btn">update entry</button>
                <button type="button" className="nes-btn">delete entry</button>
            </div>
        </div>
  )
}

function EntriesList(): ReactNode {
    const [entries, setEntries] = useState(new Map<string, string>);
    useEffect(() => {
        fetch(apiUrl).then(response => {
            if (!response.ok) {
                throw new Error(`network response failed from url ${apiUrl}`);
            }

            return response.json()
        }).then(jsonResponse => {
            const data: Map<string, string> = new Map(Object.entries(jsonResponse['data']));
            setEntries(data)
        }).catch(error => {
            console.error(`api call failed: ${error}`)
        });
    }, [])

    let entryList: JSX.Element[] = [];
        entries.forEach((value, key) => {
            entryList.push(
                <tr className="table-element">
                    <td>
                        <div className="table-element">{key}</div>
                    </td>
                    <td>
                        <div className="table-element">{value}</div>
                    </td>
                </tr>
        )
    })

    return(
            <div className="table">
                <table className="nes-table is-bordered is-centered is-dark">
                    <thead>
                      <tr>
                        <th><div className="table-element">path on a site</div></th>
                        <th><div className="table-element">url to redirect</div></th>
                      </tr>
                    </thead>
                    <tbody id="table_body">
                        {entryList}
                    </tbody>
                </table>
            </div>
    ) 
}