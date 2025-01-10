const apiPath = '/api/v1/entries';
const apiUrl = window.location.origin + apiPath;

var tableContent = document.getElementById("table_body");

fetch(apiUrl).then(response => {
    if (!response.ok) {
        throw new Error("network response failed:", apiUrl);
    }
    return response.json();
})
.then(output => {
    const data = output['data']; 

    for (const key in data) {
        addRowToTable(tableContent, key, data[key])

        console.log(`${key}: ${data[key]}`);
    }
})
.catch(error => {
    console.error("error fetching api:", error);
});

function addRowToTable(tbody, key, value) {
        var tr = document.createElement("tr");
        tbody.appendChild(tr);
        
        var td_key = document.createElement("td");
        tr.appendChild(td_key);
        
        var tdkey_div = document.createElement("div")
        tdkey_div.classList.add("table-element")
        tdkey_div.appendChild(document.createTextNode(key))
        td_key.appendChild(tdkey_div)

        var td_value = document.createElement("td");
        tr.appendChild(td_value);

        var tdval_div = document.createElement("div")
        tdval_div.classList.add("table-element")
        tdval_div.appendChild(document.createTextNode(value))
        td_value.appendChild(tdval_div)
}