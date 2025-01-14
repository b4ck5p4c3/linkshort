import { ReactNode, useEffect, useState } from "react";
import ToroHeyyy from "./../assets/toro_heyyy.png";

const apiPath = '/api/v1/entries';
const apiUrl = window.location.origin + apiPath;


export default function AdminPage() {
    return(
         <div className="center">
            <img src={ToroHeyyy}></img>
            <EntriesList></EntriesList>

            <div>
                <AddEntry></AddEntry>
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
            const error: string = jsonResponse['error'];
            if (error != "") {
                throw new Error(error)
            }

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

function AddEntry(): ReactNode {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [requestFailedErr, setRequestFailedErr] = useState("")
   // const [requestFailedErr, _] = useState("")

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const pathElement = e.currentTarget.elements.namedItem("path") as HTMLInputElement | null;
        const urlToRedirect = e.currentTarget.elements.namedItem("url") as HTMLInputElement| null;

        if (pathElement == null) {
            console.log("cannot find text element \"path on a site\"")
            setIsDialogOpen(false)
            return
        }

        if (urlToRedirect == null) {
            console.log("cannot find text element \"url to redirect\"")
            setIsDialogOpen(false)
            return
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

        const response = await req.json();
        if (response['error'] != "") {
            setRequestFailedErr(response['error']);
            setIsDialogOpen(false)
            return
        }

        window.location.reload()
    }

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
    )

    const dialogError = (
        <dialog className="nes-dialog is-dark dialog-box" open>
                <div className="center">
                    adding entry failed: {requestFailedErr}
                    <button type="button" className="nes-btn" onClick={() => setRequestFailedErr("")}>okaaay</button>
                </div>
        </dialog>
    )

    return(
        <>
            <button type="button" className="nes-btn" onClick={() => setIsDialogOpen(true)}>add entry</button>
            {isDialogOpen ? dialog: null}
            {requestFailedErr != "" ? dialogError: null}
        </>
    )
}
