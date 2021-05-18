

// ----------------  TELEFONLISTE ---------------- 
async function telefonliste_load() {
	try {

		let response = await fetchWithParam('app/api/telefonliste', {});

		document.getElementById("telefonliste_list").innerHTML = '';

		for(let i = 0; i < response.length; i++) {
			
			let entry = response[i];
			
			let newDiv = document.createElement("div");		
									
			newDiv.className = 'item';
			newDiv.innerHTML += `<div class="row">
									<div class="col-50">
										<span class="text-small">${entry.name}</span>
									</div>
									<div class="col-50">
										<span class="text-small">${entry.vorname}</span>
									</div>
								</div>`;
			newDiv.onclick = () => {
				alert(`${entry.name} ${entry.vorname}<br><br>
				<a href="tel:${entry.tel}" style="color: blue;">Tel: ${entry.tel}</a><br><br>
				<a href="tel:${entry.tel_dienst}" style="color: blue;">Dienstlich: ${entry.tel_dienst}</a><br><br>
				<a href="tel:${entry.tel_mobil}" style="color: blue;">Mobil: ${entry.tel_mobil}</a><br>`)
			};
			
			document.getElementById("telefonliste_list").appendChild(newDiv); 
		
		}

    } catch (error) {
		console.log(error);	
		alert("Telefonliste konnte nicht geladen werden.");
	}
}

function telefonliste_filter() {
	//https://www.w3schools.com/howto/howto_js_filter_lists.asp
	// Declare variables
	var input, filter, ul, li, a, i, txtValue;
	input = document.getElementById('telefonliste_filter');
	filter = input.value.toUpperCase();
	ul = document.getElementById("telefonliste_list");
	li = ul.getElementsByClassName('item');
  
	// Loop through all list items, and hide those who don't match the search query
	for (i = 0; i < li.length; i++) {
	  	a = li[i].getElementsByTagName("span");
		let disp = false;
		for (j = 0; j < a.length; j++) {
			txtValue = a[j].textContent || a[j].innerText;
			if(txtValue.toUpperCase().indexOf(filter) > -1) disp = true;
		}
	
	 	if (disp) {
			li[i].style.display = "";
	  	} else {
			li[i].style.display = "none";
	  	}
	}
}