// Master list of Indian cities/towns for vendor location tagging, organized
// by state/UT. Kept in sync with Zella-Screenings-backend/utils/indianCities.js
// (mirrors the same dataset so frontend search/display and backend validation agree).
export const INDIAN_CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Rajahmundry","Kakinada","Tirupati","Kadapa","Anantapur","Vizianagaram","Eluru","Ongole","Nandyal","Machilipatnam","Adoni","Tenali","Proddatur","Chittoor","Hindupur","Bhimavaram","Madanapalle","Guntakal","Dharmavaram","Gudivada","Srikakulam","Narasaraopet","Tadepalligudem","Chilakaluripet","Amaravati"],
  "Arunachal Pradesh": ["Itanagar","Naharlagun","Pasighat","Tawang","Ziro","Bomdila","Along","Changlang","Tezu","Roing"],
  "Assam": ["Guwahati","Silchar","Dibrugarh","Jorhat","Nagaon","Tinsukia","Tezpur","Bongaigaon","Karimganj","Sivasagar","Goalpara","Barpeta","Dhubri","North Lakhimpur","Diphu","Golaghat","Kokrajhar","Hailakandi","Nalbari","Mangaldoi"],
  "Bihar": ["Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Darbhanga","Bihar Sharif","Arrah","Begusarai","Katihar","Munger","Chhapra","Danapur","Saharsa","Sasaram","Hajipur","Dehri","Siwan","Motihari","Nawada","Bagaha","Buxar","Kishanganj","Sitamarhi","Jamalpur","Jehanabad","Aurangabad","Madhubani","Samastipur","Bettiah"],
  "Chhattisgarh": ["Raipur","Bhilai","Bilaspur","Korba","Durg","Rajnandgaon","Jagdalpur","Raigarh","Ambikapur","Mahasamund","Dhamtari","Chirmiri","Janjgir","Kanker","Kawardha","Bemetara","Baloda Bazar","Kondagaon"],
  "Goa": ["Panaji","Margao","Vasco da Gama","Mapusa","Ponda","Bicholim","Curchorem","Sanquelim","Cuncolim","Canacona"],
  "Gujarat": ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Junagadh","Gandhinagar","Anand","Navsari","Morbi","Nadiad","Surendranagar","Bharuch","Mehsana","Bhuj","Porbandar","Palanpur","Valsad","Vapi","Gondal","Veraval","Godhra","Patan","Kalol","Dahod","Botad","Amreli","Deesa","Jetpur","Sidhpur","Himatnagar","Ankleshwar"],
  "Haryana": ["Faridabad","Gurugram","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal","Sonipat","Panchkula","Bhiwani","Sirsa","Bahadurgarh","Jind","Thanesar","Kaithal","Rewari","Palwal","Hansi","Narnaul","Fatehabad","Gohana","Tohana","Kurukshetra"],
  "Himachal Pradesh": ["Shimla","Solan","Dharamshala","Mandi","Kullu","Hamirpur","Una","Bilaspur","Chamba","Nahan","Palampur","Baddi","Kangra","Manali","Rohru","Nalagarh"],
  "Jharkhand": ["Ranchi","Jamshedpur","Dhanbad","Bokaro Steel City","Deoghar","Hazaribagh","Giridih","Ramgarh","Medininagar","Chirkunda","Phusro","Dumka","Chaibasa","Gumla","Godda","Sahibganj","Pakur","Chatra","Lohardaga","Jhumri Telaiya"],
  "Karnataka": ["Bengaluru","Mysuru","Hubballi","Mangaluru","Belagavi","Kalaburagi","Davangere","Ballari","Vijayapura","Shivamogga","Tumakuru","Raichur","Bidar","Hospet","Hassan","Gadag","Udupi","Bagalkot","Chitradurga","Kolar","Mandya","Chikkamagaluru","Ranebennuru","Robertsonpet","Bhadravati","Gangavati","Karwar","Sirsi","Puttur","Yadgir","Kollegal","Ramanagara","Chamarajanagar","Haveri","Koppal"],
  "Kerala": ["Thiruvananthapuram","Kochi","Kozhikode","Kollam","Thrissur","Alappuzha","Palakkad","Kannur","Kottayam","Malappuram","Manjeri","Thalassery","Ponnani","Vatakara","Kanhangad","Payyanur","Koyilandy","Neyyattinkara","Kayamkulam","Nedumangad","Perinthalmanna","Punalur","Pathanamthitta","Idukki","Wayanad","Ernakulam","Muvattupuzha","Kasaragod","Attingal","Changanassery"],
  "Madhya Pradesh": ["Indore","Bhopal","Jabalpur","Gwalior","Ujjain","Sagar","Dewas","Satna","Ratlam","Rewa","Murwara","Singrauli","Burhanpur","Khandwa","Bhind","Chhindwara","Guna","Shivpuri","Vidisha","Damoh","Mandsaur","Khargone","Neemuch","Pithampur","Narmadapuram","Itarsi","Sehore","Betul","Seoni","Datia","Balaghat","Chhatarpur","Tikamgarh","Shahdol","Morena"],
  "Maharashtra": ["Mumbai","Pune","Nagpur","Thane","Nashik","Aurangabad","Solapur","Kalyan","Vasai-Virar","Navi Mumbai","Kolhapur","Amravati","Nanded","Sangli","Malegaon","Jalgaon","Akola","Latur","Dhule","Ahmednagar","Chandrapur","Parbhani","Ichalkaranji","Jalna","Bhusawal","Panvel","Satara","Beed","Yavatmal","Osmanabad","Nandurbar","Wardha","Udgir","Gondia","Baramati","Ratnagiri","Sindhudurg","Karad","Barshi","Wai","Alibag","Buldhana","Hingoli","Washim","Palghar"],
  "Manipur": ["Imphal","Thoubal","Bishnupur","Churachandpur","Kakching","Senapati","Ukhrul","Tamenglong","Jiribam","Moirang"],
  "Meghalaya": ["Shillong","Tura","Jowai","Nongstoin","Baghmara","Williamnagar","Resubelpara","Mawkyrwat","Nongpoh","Cherrapunji"],
  "Mizoram": ["Aizawl","Lunglei","Champhai","Serchhip","Kolasib","Lawngtlai","Mamit","Saiha"],
  "Nagaland": ["Kohima","Dimapur","Mokokchung","Tuensang","Wokha","Zunheboto","Phek","Mon","Longleng","Peren"],
  "Odisha": ["Bhubaneswar","Cuttack","Rourkela","Berhampur","Sambalpur","Puri","Balasore","Bhadrak","Baripada","Jharsuguda","Jeypore","Barbil","Kendujhar","Rayagada","Bargarh","Paradip","Angul","Dhenkanal","Koraput","Talcher","Sunabeda","Jajpur","Balangir","Nabarangpur","Phulbani","Nayagarh","Kendrapara","Malkangiri"],
  "Punjab": ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Hoshiarpur","Batala","Pathankot","Moga","Abohar","Malerkotla","Khanna","Phagwara","Muktsar","Barnala","Rajpura","Firozpur","Kapurthala","Zirakpur","Kot Kapura","Faridkot","Sangrur","Nabha","Gurdaspur","Mansa","Fazilka","Rupnagar","Nawanshahr","Tarn Taran"],
  "Rajasthan": ["Jaipur","Jodhpur","Kota","Bikaner","Ajmer","Udaipur","Bhilwara","Alwar","Bharatpur","Sikar","Pali","Sri Ganganagar","Kishangarh","Baran","Dhaulpur","Tonk","Beawar","Hanumangarh","Churu","Jhunjhunu","Nagaur","Barmer","Banswara","Chittorgarh","Dausa","Sawai Madhopur","Jaisalmer","Sirohi","Dungarpur","Rajsamand","Jalore","Pratapgarh","Karauli","Bundi","Baran","Pushkar","Nathdwara"],
  "Sikkim": ["Gangtok","Namchi","Gyalshing","Mangan","Rangpo","Jorethang","Singtam"],
  "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Erode","Vellore","Thoothukudi","Dindigul","Thanjavur","Ranipet","Sivakasi","Karur","Udhagamandalam","Hosur","Nagercoil","Kanchipuram","Kumbakonam","Cuddalore","Tiruvannamalai","Pollachi","Rajapalayam","Pudukkottai","Neyveli","Nagapattinam","Namakkal","Krishnagiri","Ramanathapuram","Sivaganga","Virudhunagar","Ariyalur","Perambalur","Theni","Tenkasi","Villupuram","Karaikudi","Vaniyambadi","Tiruchengode"],
  "Telangana": ["Hyderabad","Secunderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam","Mahbubnagar","Nalgonda","Adilabad","Suryapet","Miryalaguda","Siddipet","Jagtial","Mancherial","Sangareddy","Medak","Wanaparthy","Vikarabad","Kamareddy","Jangaon","Bhongir","Kothagudem"],
  "Tripura": ["Agartala","Udaipur","Dharmanagar","Kailasahar","Belonia","Khowai","Ambassa","Sabroom","Sonamura","Kamalpur"],
  "Uttar Pradesh": ["Lucknow","Kanpur","Ghaziabad","Agra","Meerut","Varanasi","Prayagraj","Bareilly","Aligarh","Moradabad","Saharanpur","Gorakhpur","Noida","Firozabad","Jhansi","Muzaffarnagar","Mathura","Rampur","Shahjahanpur","Farrukhabad","Ayodhya","Maunath Bhanjan","Hapur","Etawah","Mirzapur","Bulandshahr","Sambhal","Amroha","Hardoi","Fatehpur","Raebareli","Orai","Sitapur","Bahraich","Modinagar","Unnao","Jaunpur","Lakhimpur","Hathras","Banda","Pilibhit","Barabanki","Khurja","Gonda","Mainpuri","Shikohabad","Basti","Chandausi","Akbarpur","Ballia","Tanda","Greater Noida","Kasganj","Deoria","Azamgarh","Etah","Sultanpur","Pratapgarh","Bijnor","Budaun","Chandpur","Gajraula"],
  "Uttarakhand": ["Dehradun","Haridwar","Roorkee","Haldwani","Rudrapur","Kashipur","Rishikesh","Ramnagar","Pithoragarh","Nainital","Mussoorie","Almora","Pauri","Tehri","Kotdwar","Manglaur","Jaspur","Sitarganj","Bageshwar","Champawat"],
  "West Bengal": ["Kolkata","Asansol","Siliguri","Durgapur","Bardhaman","Malda","Baharampur","Habra","Kharagpur","Shantipur","Dankuni","Dhulian","Ranaghat","Haldia","Raiganj","Krishnanagar","Nabadwip","Medinipur","Jalpaiguri","Balurghat","Basirhat","Bankura","Chakdaha","Darjeeling","Alipurduar","Purulia","Jangipur","Bolpur","Cooch Behar","Tamluk","Contai","Suri"],
  "Andaman and Nicobar Islands": ["Port Blair","Diglipur","Rangat","Mayabunder","Car Nicobar"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman","Diu","Silvassa"],
  "Delhi": ["New Delhi","Delhi","Dwarka","Rohini","Karol Bagh","Saket","Vasant Kunj","Pitampura","Janakpuri","Lajpat Nagar","Mayur Vihar","Shahdara","Narela","Najafgarh"],
  "Jammu and Kashmir": ["Srinagar","Jammu","Anantnag","Baramulla","Sopore","Kathua","Udhampur","Rajouri","Poonch","Kupwara","Pulwama","Budgam","Bandipora","Ganderbal","Kulgam","Doda","Kishtwar","Samba","Ramban"],
  "Ladakh": ["Leh","Kargil"],
  "Lakshadweep": ["Kavaratti","Agatti","Minicoy"],
  "Puducherry": ["Puducherry","Karaikal","Mahe","Yanam"],
};

// Flat, sorted list of every city — the actual dropdown source.
export const INDIAN_CITIES: string[] = Array.from(
  new Set(Object.values(INDIAN_CITIES_BY_STATE).flat())
).sort((a, b) => a.localeCompare(b));
