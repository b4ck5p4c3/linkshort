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

            return response.json();
        }).then(jsonResponse => {
            const error: string = jsonResponse['error'];
            if (error != "") {
                throw new Error(error);
            }

            const data: Map<string, string> = new Map(Object.entries(jsonResponse['data']));
            setEntries(data);
        }).catch(error => {
            console.error(`api call failed: ${error}`);
        });
    }, []);

    const addEntryUpdate = (key: string, value: string) => {
                    setEntries((oldEntries) => {
                        const entries = new Map(oldEntries);
                        return entries.set(key, value);
                    });};

    const deleteEntryUpdate = (key: string) => {
                    setEntries((oldEntries) => {
                        const entries = new Map(oldEntries);
                        entries.delete(key);
                        return entries;
                    });
    };

    return(
         <div className="center">
            <img src={ToroHeyyy}></img>
            <EntriesList entries={entries}></EntriesList>

            <div>
                <AddEntry updateEntries={addEntryUpdate}></AddEntry>
                <button type="button" className="nes-btn">update entry</button>
                <DeleteEntry entries={entries} updateEntries={deleteEntryUpdate}></DeleteEntry>
            </div>
        </div>
  );
}


function errorDialog(errorText: string, okButtonOnclick: () => void): ReactNode {
    return (
        <dialog className="nes-dialog is-dark dialog-box" open>
                <div className="center">
                    {errorText}
                    <button type="button" className="nes-btn" onClick={okButtonOnclick}>okaaay</button>
                </div>
        </dialog>
    );
}


interface EntriesListProps {
    entries: Map<string, string>
}

function EntriesList({entries}: EntriesListProps): ReactNode {
   const entryList: JSX.Element[] = [];
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
        );
    });

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
    ); 
}


interface AddEntryProps {
    updateEntries: (key: string, value: string) => void
}

function AddEntry({updateEntries}: AddEntryProps): ReactNode {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestFailedErr, setRequestFailedErr] = useState("");

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const pathElement = e.currentTarget.elements.namedItem("path") as HTMLInputElement | null;
        const urlToRedirect = e.currentTarget.elements.namedItem("url") as HTMLInputElement| null;

        if (pathElement == null) {
            console.error("cannot find text element \"path on a site\"");
            setIsDialogOpen(false);
            return;
        }

        if (urlToRedirect == null) {
            console.error("cannot find text element \"url to redirect\"");
            setIsDialogOpen(false);
            return;
        }

        const req = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({
                [pathElement.value]: urlToRedirect.value
            }),
            headers: {
                'Content-type': 'application/json'
            }


        });

        if (!req.ok) {
            console.error(`api request to ${apiUrl} failed`);
        }

        const response = await req.json();

        const err: string = response['error'];

        if (err != "") {
            setRequestFailedErr(err);
            setIsDialogOpen(false);
            return;
        }
        
        const data: Map<string, string> = new Map(Object.entries(response['data']));
        
        data.forEach((value, key) => {
            updateEntries(key, value);
        });

        setIsDialogOpen(false);
    };

    const dialog = (
        <dialog className="nes-dialog is-dark dialog-box" open>
            <form method="dialog" onSubmit={submitForm}>
                <div className="center">add entry</div>
                 <menu className="dialog-menu">
                     <input type="text" name="path" className="nes-input is-dark" placeholder="path on a site"></input>
                     <input type="text" name="url" className="nes-input is-dark" placeholder="url to redirect"></input>

                     <div className="dialog-buttons">
                         <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(false)}>cancel</button>
                         <button type="submit" className="nes-btn is-primary">confirm</button>
                     </div>
                 </menu>
             </form>
         </dialog>
    );

    return(
        <>
            <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(true)}>add entry</button>
            {isDialogOpen ? dialog: null}
            {requestFailedErr != "" ? errorDialog(`adding entry failed: ${requestFailedErr}`, () => {setRequestFailedErr("");}): null}
        </>
    );
}


interface deleteEntryProps {
    updateEntries: (key: string) => void
    entries: Map<string, string>
}

function DeleteEntry({entries, updateEntries}: deleteEntryProps): ReactNode {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestFailedErr, setRequestFailedErr] = useState("");

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const entryIdElement = e.currentTarget.elements.namedItem("entry-id") as HTMLSelectElement | null;

        if (entryIdElement == null) {
            console.error("cannot find option element \"entry-id\"");
            setIsDialogOpen(false);
            return;
        }

        const req = await fetch(apiUrl, {
            method: 'DELETE',
            body: JSON.stringify(entryIdElement.value),
            headers: {
                'Content-type': 'application/json'
            }
        });

        if (!req.ok) {
            console.error(`api request to ${apiUrl} failed`);
        }

        const response = await req.json();
        const err: string = response['error'];

        if (err != "") {
            setRequestFailedErr(err);
            setIsDialogOpen(false);
            return;
        }

        const data: string = response['data'];

        updateEntries(data);

        setIsDialogOpen(false);
    };

    const selectList: JSX.Element[] = [];
    entries.forEach((value, key) => {
        selectList.push(
            <option value={key}>{`{"${key}": "${value}"}`}</option>
        );
    });

    const select = (
        <div className="nes-select is-dark">
            <select required name="entry-id">
                <option value="" disabled selected hidden>select...</option>
                {selectList}
            </select>
        </div>
    );

    const dialog: ReactNode = (
        <dialog className="nes-dialog is-dark dialog-box" open>
            <form method="dialog" onSubmit={submitForm}>
                <div className="center">delete entry</div>
                <menu className="dialog-menu">
                    {select}
                    <div className="dialog-buttons">
                         <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(false)}>cancel</button>
                         <button type="submit" className="nes-btn is-primary">confirm</button>
                    </div>
                </menu>
            </form>
        </dialog>
    );

    return(
        <>
            <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(true)}>delete entry</button>
            {isDialogOpen ? dialog: null}
            {requestFailedErr != "" ? errorDialog(`deleting entry failed: ${requestFailedErr}`, () => {setRequestFailedErr("");}): null}
        </>
    );
}

interface updateEntryProps {
    updateEntries: (key: string) => void
    entries: Map<string, string>
}

function UpdateEntry({updateEntries, entries}: updateEntryProps): ReactNode {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestFailedErr, setRequestFailedErr] = useState("");
    updateEntries("puk");

    const selectList: JSX.Element[] = [];
    entries.forEach((value, key) => {
        selectList.push(
            <option value={key}>{`{"${key}": "${value}"}`}</option>
        );
    });

    const select = (
        <div className="nes-select is-dark">
            <select required name="entry-id">
                <option value="" disabled selected hidden>select...</option>
                {selectList}
            </select>
        </div>
    );

    const dialog: ReactNode = (
        <dialog className="nes-dialog is-dark dialog-box" open>
            <form method="dialog">
                <div className="center">update entry</div>
                <menu className="dialog-menu">
                    {select}
                    <div className="dialog-buttons">
                         <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(false)}>cancel</button>
                         <button type="submit" className="nes-btn is-primary">confirm</button>
                    </div>
                </menu>
            </form>
        </dialog>
    );

    return(
        <>
            <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(true)}>delete entry</button>
            {isDialogOpen ? dialog: null}
            {requestFailedErr != "" ? errorDialog(`deleting entry failed: ${requestFailedErr}`, () => {setRequestFailedErr("");}): null}
        </>
    );
}