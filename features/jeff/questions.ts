import type { ReadingQuestion } from "@/features/reading-test/types";
import type { JeffLanguage } from "@/features/jeff/catalog";

/** Five authored comprehension questions per episode in each target language.
 * They test events, choices, and consequences; not a single interpretation of the author's intent.
 * Levels share the same episode-level facts. A reviewer should audit each adaptation before release.
 */
const bank: Record<JeffLanguage, Record<string, ReadingQuestion[]>> = {
  "en": {
    "1": [
      {
        "id": "j01-q1",
        "question": "Why does Jeff order at the airport restaurant?",
        "choices": [
          "His friend gets stuck trying to speak Japanese.",
          "The waiter refuses to serve his friend.",
          "Jeff cannot read the menu."
        ],
        "correctAnswer": "His friend gets stuck trying to speak Japanese."
      },
      {
        "id": "j01-q2",
        "question": "What do they order that proves too much?",
        "choices": [
          "Another bowl of katsudon.",
          "Two bowls of soup.",
          "A large birthday cake."
        ],
        "correctAnswer": "Another bowl of katsudon."
      },
      {
        "id": "j01-q3",
        "question": "What does Jeff admit about the sauce?",
        "choices": [
          "He doesn't know exactly what's in it.",
          "He made it himself.",
          "It comes from his hometown."
        ],
        "correctAnswer": "He doesn't know exactly what's in it."
      },
      {
        "id": "j01-q4",
        "question": "How do the friends react after eating too much?",
        "choices": [
          "They sit on a bench and rest.",
          "They immediately go hiking.",
          "They order a third meal."
        ],
        "correctAnswer": "They sit on a bench and rest."
      },
      {
        "id": "j01-q5",
        "question": "What does the final exchange settle?",
        "choices": [
          "They will take the train rather than a taxi.",
          "They will spend the night at the airport.",
          "They will rent a car."
        ],
        "correctAnswer": "They will take the train rather than a taxi."
      }
    ],
    "2": [
      {
        "id": "j02-q1",
        "question": "What surprises Jeff's friend about the apartment?",
        "choices": [
          "One small room serves several purposes.",
          "It has three guest bedrooms.",
          "It has no windows or doors."
        ],
        "correctAnswer": "One small room serves several purposes."
      },
      {
        "id": "j02-q2",
        "question": "Why does the suitcase become an obstacle?",
        "choices": [
          "There is very little room to move.",
          "It has broken wheels.",
          "It belongs to the neighbor."
        ],
        "correctAnswer": "There is very little room to move."
      },
      {
        "id": "j02-q3",
        "question": "What does Jeff collect in folders?",
        "choices": [
          "Chopstick sleeves with different designs.",
          "Train ticket stubs only.",
          "Restaurant receipts from America."
        ],
        "correctAnswer": "Chopstick sleeves with different designs."
      },
      {
        "id": "j02-q4",
        "question": "How does his friend react to that collection?",
        "choices": [
          "He finds it strange to keep something people throw away.",
          "He asks to buy the whole collection.",
          "He says he has the same hobby."
        ],
        "correctAnswer": "He finds it strange to keep something people throw away."
      },
      {
        "id": "j02-q5",
        "question": "What discovery ends the chapter?",
        "choices": [
          "His friend sees a floor-level Japanese toilet.",
          "The apartment has a hidden balcony.",
          "Jeff has a second apartment."
        ],
        "correctAnswer": "His friend sees a floor-level Japanese toilet."
      }
    ],
    "3": [
      {
        "id": "j03-q1",
        "question": "What makes the descent worth remembering?",
        "choices": [
          "A photo catches the friends at an awkward moment.",
          "They lose their train passes.",
          "They see snow falling."
        ],
        "correctAnswer": "A photo catches the friends at an awkward moment."
      },
      {
        "id": "j03-q2",
        "question": "Who pushes a race up the steps?",
        "choices": [
          "Jeff's friend starts running first.",
          "A park ranger orders them to run.",
          "Jeff refuses to climb."
        ],
        "correctAnswer": "Jeff's friend starts running first."
      },
      {
        "id": "j03-q3",
        "question": "What draws the friend into the monkey park?",
        "choices": [
          "He wants to see the monkeys despite the detour.",
          "He has been hired there.",
          "He needs to collect a parcel."
        ],
        "correctAnswer": "He wants to see the monkeys despite the detour."
      },
      {
        "id": "j03-q4",
        "question": "How does the young monkey behave?",
        "choices": [
          "It keeps bothering a larger monkey even after being pushed away.",
          "It sleeps through the visit.",
          "It follows Jeff home."
        ],
        "correctAnswer": "It keeps bothering a larger monkey even after being pushed away."
      },
      {
        "id": "j03-q5",
        "question": "What does the friend choose to keep?",
        "choices": [
          "The unflattering chairlift photograph.",
          "A lost shoe from the mountain.",
          "Jeff's train pass."
        ],
        "correctAnswer": "The unflattering chairlift photograph."
      }
    ],
    "4": [
      {
        "id": "j04-q1",
        "question": "What confuses his friend when opening the rice snack?",
        "choices": [
          "The plastic wrapping around the seaweed.",
          "An unexpected fork inside.",
          "A missing ingredient label."
        ],
        "correctAnswer": "The plastic wrapping around the seaweed."
      },
      {
        "id": "j04-q2",
        "question": "How does the friend prepare to order matcha?",
        "choices": [
          "He practices the Japanese phrase on his phone.",
          "He asks Jeff to write a letter.",
          "He points silently at the kitchen."
        ],
        "correctAnswer": "He practices the Japanese phrase on his phone."
      },
      {
        "id": "j04-q3",
        "question": "Why do they stay so long in the garden?",
        "choices": [
          "They sit quietly and lose track of time.",
          "The gate is locked.",
          "They are waiting for a bus inside."
        ],
        "correctAnswer": "They sit quietly and lose track of time."
      },
      {
        "id": "j04-q4",
        "question": "What persuades the tired friend to go to the hot springs?",
        "choices": [
          "Jeff says they can sit down there.",
          "It is the only way home.",
          "He has an appointment with a doctor."
        ],
        "correctAnswer": "Jeff says they can sit down there."
      },
      {
        "id": "j04-q5",
        "question": "What interrupts his friend's sleep on the train?",
        "choices": [
          "Jeff wakes him so they can change trains.",
          "A conductor announces a fire.",
          "His phone alarm rings at midnight."
        ],
        "correctAnswer": "Jeff wakes him so they can change trains."
      }
    ],
    "5": [
      {
        "id": "j05-q1",
        "question": "What turns the station into a maze for the friends?",
        "choices": [
          "The passages keep splitting and their exits are confusing.",
          "All signs have been removed.",
          "The trains stop for the whole day."
        ],
        "correctAnswer": "The passages keep splitting and their exits are confusing."
      },
      {
        "id": "j05-q2",
        "question": "What helps them finally find the correct exit?",
        "choices": [
          "They compare a map with the signs at each turn.",
          "They follow a stranger carrying a black bag.",
          "They call a taxi from underground."
        ],
        "correctAnswer": "They compare a map with the signs at each turn."
      },
      {
        "id": "j05-q3",
        "question": "Why is arriving at the school important?",
        "choices": [
          "Jeff's friend needs to complete arrangements for studying Japanese.",
          "They are going there to see a concert.",
          "Jeff works there as a teacher."
        ],
        "correctAnswer": "Jeff's friend needs to complete arrangements for studying Japanese."
      },
      {
        "id": "j05-q4",
        "question": "What contrast does the friend notice in his new place?",
        "choices": [
          "His place has a bed, while Jeff uses a futon.",
          "It has no running water.",
          "It is inside the school library."
        ],
        "correctAnswer": "His place has a bed, while Jeff uses a futon."
      },
      {
        "id": "j05-q5",
        "question": "What shows the friend gaining independence by the end?",
        "choices": [
          "He insists he can find his own way with the map.",
          "Jeff carries all his luggage home.",
          "He moves back to the airport."
        ],
        "correctAnswer": "He insists he can find his own way with the map."
      }
    ],
    "6": [
      {
        "id": "j06-q1",
        "question": "Why does the cook shout at Jeff?",
        "choices": [
          "Jeff returns lettuce to a salad after putting it on a shared counter.",
          "Jeff breaks an expensive plate.",
          "Jeff arrives late for his shift."
        ],
        "correctAnswer": "Jeff returns lettuce to a salad after putting it on a shared counter."
      },
      {
        "id": "j06-q2",
        "question": "How does Jeff first explain the incident to a coworker?",
        "choices": [
          "He focuses on being shouted at while making salads.",
          "He says he is quitting immediately.",
          "He says the food was burned."
        ],
        "correctAnswer": "He focuses on being shouted at while making salads."
      },
      {
        "id": "j06-q3",
        "question": "Why is the shared counter a problem for uncooked salad?",
        "choices": [
          "Raw meat or fish may have touched it earlier.",
          "It makes the lettuce too cold.",
          "The counter belongs to a customer."
        ],
        "correctAnswer": "Raw meat or fish may have touched it earlier."
      },
      {
        "id": "j06-q4",
        "question": "What complicates Jeff's suspicion of unfair treatment?",
        "choices": [
          "The cook also shouts at Japanese staff.",
          "The cook speaks perfect English.",
          "Jeff is the only worker in the kitchen."
        ],
        "correctAnswer": "The cook also shouts at Japanese staff."
      },
      {
        "id": "j06-q5",
        "question": "What does Jeff admit before returning to work?",
        "choices": [
          "He has put dropped food back before when no one was watching.",
          "He cannot make any salads.",
          "He has been secretly cooking at home."
        ],
        "correctAnswer": "He has put dropped food back before when no one was watching."
      }
    ],
    "7": [
      {
        "id": "j07-q1",
        "question": "What first catches Jeff's attention at the restaurant?",
        "choices": [
          "Folded chopstick sleeves left by customers.",
          "A missing wallet under a table.",
          "A new menu of desserts."
        ],
        "correctAnswer": "Folded chopstick sleeves left by customers."
      },
      {
        "id": "j07-q2",
        "question": "What does Jeff try to make from a wrapper?",
        "choices": [
          "A small rest for chopsticks.",
          "A paper hat for a child.",
          "A replacement restaurant receipt."
        ],
        "correctAnswer": "A small rest for chopsticks."
      },
      {
        "id": "j07-q3",
        "question": "What makes his attempts difficult?",
        "choices": [
          "The folds won't hold the chopsticks steadily.",
          "He has run out of paper.",
          "The kitchen is completely dark."
        ],
        "correctAnswer": "The folds won't hold the chopsticks steadily."
      },
      {
        "id": "j07-q4",
        "question": "How does the phone call affect his attempt?",
        "choices": [
          "He keeps working while talking to his friend.",
          "His friend orders him to throw the paper away.",
          "He leaves to catch a train."
        ],
        "correctAnswer": "He keeps working while talking to his friend."
      },
      {
        "id": "j07-q5",
        "question": "What does Jeff do with the imperfect result?",
        "choices": [
          "He keeps the wrinkled wrapper in his binder.",
          "He sells it to a customer.",
          "He burns it in the kitchen."
        ],
        "correctAnswer": "He keeps the wrinkled wrapper in his binder."
      }
    ],
    "8": [
      {
        "id": "j08-q1",
        "question": "Why does Jeff take out his wrinkled chopstick rest?",
        "choices": [
          "He wants to learn how to fold it properly.",
          "He wants to return it to a customer.",
          "He plans to mail it abroad."
        ],
        "correctAnswer": "He wants to learn how to fold it properly."
      },
      {
        "id": "j08-q2",
        "question": "What does Jeff look for to help with the folds?",
        "choices": [
          "A book with folding patterns.",
          "A cookbook of ramen recipes.",
          "A train timetable."
        ],
        "correctAnswer": "A book with folding patterns."
      },
      {
        "id": "j08-q3",
        "question": "What does he notice while trying to copy the examples?",
        "choices": [
          "The steps are more difficult than they first appear.",
          "The book has blank pages.",
          "The paper folds by itself."
        ],
        "correctAnswer": "The steps are more difficult than they first appear."
      },
      {
        "id": "j08-q4",
        "question": "Why does Jeff leave a clean sleeve unused near the end?",
        "choices": [
          "He returns it to the collection and continues with the worn one.",
          "It belongs to his boss.",
          "He needs it to write a letter."
        ],
        "correctAnswer": "He returns it to the collection and continues with the worn one."
      },
      {
        "id": "j08-q5",
        "question": "What does Jeff do after putting the clean sleeve away?",
        "choices": [
          "He opens the book to the next page.",
          "He throws away his binder.",
          "He leaves for the airport."
        ],
        "correctAnswer": "He opens the book to the next page."
      }
    ],
    "9": [
      {
        "id": "j09-q1",
        "question": "Why does Jeff's friend want to visit the regional shops?",
        "choices": [
          "He is searching for a small cup for drinking sake.",
          "He needs a new suitcase.",
          "He is looking for a part-time job."
        ],
        "correctAnswer": "He is searching for a small cup for drinking sake."
      },
      {
        "id": "j09-q2",
        "question": "What attracts Jeff at the Hokkaido shop?",
        "choices": [
          "The selection of regional ramen.",
          "A display of winter coats.",
          "A book about monkeys."
        ],
        "correctAnswer": "The selection of regional ramen."
      },
      {
        "id": "j09-q3",
        "question": "What do the friends joke about when choosing a packet?",
        "choices": [
          "Who will actually cook the ramen.",
          "Who will pay the train fare.",
          "Who has lost a photograph."
        ],
        "correctAnswer": "Who will actually cook the ramen."
      },
      {
        "id": "j09-q4",
        "question": "Why is the pottery decision not straightforward?",
        "choices": [
          "His friend likes a more expensive gray cup.",
          "All the cups are broken.",
          "They cannot enter the store."
        ],
        "correctAnswer": "His friend likes a more expensive gray cup."
      },
      {
        "id": "j09-q5",
        "question": "What stops them from immediately enjoying the ramen at home?",
        "choices": [
          "Neither of them can read the cooking directions.",
          "They forgot to buy the ramen.",
          "Their stove has disappeared."
        ],
        "correctAnswer": "Neither of them can read the cooking directions."
      }
    ],
    "10": [
      {
        "id": "j10-q1",
        "question": "Why does a neighbor stop Jeff on trash day?",
        "choices": [
          "He has put out things on the wrong collection day.",
          "He left his keys in the bin.",
          "He is blocking the road with a bicycle."
        ],
        "correctAnswer": "He has put out things on the wrong collection day."
      },
      {
        "id": "j10-q2",
        "question": "What does Jeff do before trying again?",
        "choices": [
          "He checks the collection information and sorts the bag.",
          "He throws everything in a river.",
          "He asks a taxi driver for help."
        ],
        "correctAnswer": "He checks the collection information and sorts the bag."
      },
      {
        "id": "j10-q3",
        "question": "How does the woman turn out to be connected to Jeff's work?",
        "choices": [
          "Her husband is a regular at his izakaya.",
          "She owns the restaurant.",
          "She is his cook's sister."
        ],
        "correctAnswer": "Her husband is a regular at his izakaya."
      },
      {
        "id": "j10-q4",
        "question": "What surprises Jeff about the woman's language skills?",
        "choices": [
          "She used to teach English.",
          "She knows no Japanese.",
          "She speaks only French."
        ],
        "correctAnswer": "She used to teach English."
      },
      {
        "id": "j10-q5",
        "question": "How has Jeff's behavior changed by the next trash day?",
        "choices": [
          "He offers to help sweep the street.",
          "He refuses to speak to the woman.",
          "He leaves the bags outside her door."
        ],
        "correctAnswer": "He offers to help sweep the street."
      }
    ],
    "11": [
      {
        "id": "j11-q1",
        "question": "Why does Jeff visit a public-service counter?",
        "choices": [
          "He has paperwork to complete and correct.",
          "He is applying for a passport to another country.",
          "He wants to buy a train pass."
        ],
        "correctAnswer": "He has paperwork to complete and correct."
      },
      {
        "id": "j11-q2",
        "question": "What does Jeff think about the clerk at first?",
        "choices": [
          "She is helping him fix the forms.",
          "She is refusing to see him.",
          "She is asking him for money."
        ],
        "correctAnswer": "She is helping him fix the forms."
      },
      {
        "id": "j11-q3",
        "question": "Why does Jeff keep thinking about a Japanese word afterward?",
        "choices": [
          "He heard the clerk use a word he didn't know.",
          "He forgot his own name.",
          "The word was written on a gift."
        ],
        "correctAnswer": "He heard the clerk use a word he didn't know."
      },
      {
        "id": "j11-q4",
        "question": "What does his coworker explain about the word?",
        "choices": [
          "It is an insulting, old-fashioned expression.",
          "It is a formal compliment.",
          "It is a type of vegetable."
        ],
        "correctAnswer": "It is an insulting, old-fashioned expression."
      },
      {
        "id": "j11-q5",
        "question": "What does Jeff struggle to reconcile at the end?",
        "choices": [
          "The clerk helped him but also insulted him.",
          "He arrived at the wrong station.",
          "His forms were lost in the mail."
        ],
        "correctAnswer": "The clerk helped him but also insulted him."
      }
    ],
    "12": [
      {
        "id": "j12-q1",
        "question": "What new purchase catches Jeff's eye?",
        "choices": [
          "A clay pot he can cook and eat from.",
          "An electric guitar.",
          "A bicycle for his uncle."
        ],
        "correctAnswer": "A clay pot he can cook and eat from."
      },
      {
        "id": "j12-q2",
        "question": "How does Jeff's friend react to the pot?",
        "choices": [
          "He jokes that Jeff came for a bowl and now wants a pot.",
          "He says the pot is illegal.",
          "He insists they should buy ten."
        ],
        "correctAnswer": "He jokes that Jeff came for a bowl and now wants a pot."
      },
      {
        "id": "j12-q3",
        "question": "What does his friend mean by going to meet 'Mama'?",
        "choices": [
          "They are visiting a woman who runs a bar.",
          "They are visiting his mother at home.",
          "They are going to a nursery school."
        ],
        "correctAnswer": "They are visiting a woman who runs a bar."
      },
      {
        "id": "j12-q4",
        "question": "What does 'hashigo' refer to here?",
        "choices": [
          "Moving from one bar to another.",
          "Climbing a mountain with a rope.",
          "Ordering food for delivery."
        ],
        "correctAnswer": "Moving from one bar to another."
      },
      {
        "id": "j12-q5",
        "question": "How does Jeff respond when another customer buys him a drink?",
        "choices": [
          "He thanks him and joins the toast.",
          "He leaves without answering.",
          "He asks the man to leave."
        ],
        "correctAnswer": "He thanks him and joins the toast."
      }
    ],
    "13": [
      {
        "id": "j13-q1",
        "question": "Why is Jeff invited to the festival?",
        "choices": [
          "A regular asks him to help carry the mikoshi.",
          "He has won a singing contest.",
          "The mayor hires him to take photos."
        ],
        "correctAnswer": "A regular asks him to help carry the mikoshi."
      },
      {
        "id": "j13-q2",
        "question": "What is hardest for Jeff as the mikoshi starts moving?",
        "choices": [
          "Matching his steps to those carrying the beam beside him.",
          "Finding his bicycle.",
          "Reading the food menu."
        ],
        "correctAnswer": "Matching his steps to those carrying the beam beside him."
      },
      {
        "id": "j13-q3",
        "question": "What does the older man say the mikoshi carries?",
        "choices": [
          "A deity taken through town for protection.",
          "A prize for the fastest team.",
          "A collection of restaurant plates."
        ],
        "correctAnswer": "A deity taken through town for protection."
      },
      {
        "id": "j13-q4",
        "question": "Who does Jeff unexpectedly recognize during the festival?",
        "choices": [
          "The cook who shouts at work.",
          "His old school principal from America.",
          "The airline pilot from his flight."
        ],
        "correctAnswer": "The cook who shouts at work."
      },
      {
        "id": "j13-q5",
        "question": "What changes as the day goes on?",
        "choices": [
          "Jeff begins moving more smoothly with the other carriers.",
          "Jeff leaves the town for good.",
          "Jeff becomes the festival director."
        ],
        "correctAnswer": "Jeff begins moving more smoothly with the other carriers."
      }
    ],
    "14": [
      {
        "id": "j14-q1",
        "question": "What is different about their return to Mount Takao?",
        "choices": [
          "They walk up and take the lift down.",
          "They travel there by car and never hike.",
          "They stay at the station all day."
        ],
        "correctAnswer": "They walk up and take the lift down."
      },
      {
        "id": "j14-q2",
        "question": "Why do the friends take another chairlift photo?",
        "choices": [
          "They want a better one than on their first visit.",
          "The camera belongs to a stranger.",
          "They need it for a job application."
        ],
        "correctAnswer": "They want a better one than on their first visit."
      },
      {
        "id": "j14-q3",
        "question": "What small uncertainty remains at Jeff's apartment?",
        "choices": [
          "One of the fish eggs can no longer be found.",
          "The apartment has been sold.",
          "His friend has lost a passport."
        ],
        "correctAnswer": "One of the fish eggs can no longer be found."
      },
      {
        "id": "j14-q4",
        "question": "What happens repeatedly as they walk through town?",
        "choices": [
          "People Jeff knows greet him by name.",
          "Strangers ask them for directions to the airport.",
          "A policeman tells them to leave."
        ],
        "correctAnswer": "People Jeff knows greet him by name."
      },
      {
        "id": "j14-q5",
        "question": "How does the final scene echo their first meal?",
        "choices": [
          "They agree to have only one katsudon each.",
          "They order three meals each again.",
          "They decide never to eat together."
        ],
        "correctAnswer": "They agree to have only one katsudon each."
      }
    ]
  },
  "es": {
    "1": [
      {
        "id": "j01-q1",
        "question": "¿Por qué acaba pidiendo Jeff en el restaurante del aeropuerto?",
        "choices": [
          "Su amigo se queda bloqueado al intentar hablar japonés.",
          "El camarero se niega a atender a su amigo.",
          "Jeff no sabe leer la carta."
        ],
        "correctAnswer": "Su amigo se queda bloqueado al intentar hablar japonés."
      },
      {
        "id": "j01-q2",
        "question": "¿Qué piden que luego resulta ser demasiado?",
        "choices": [
          "Otro cuenco de katsudon.",
          "Dos cuencos de sopa.",
          "Una tarta de cumpleaños grande."
        ],
        "correctAnswer": "Otro cuenco de katsudon."
      },
      {
        "id": "j01-q3",
        "question": "¿Qué reconoce Jeff sobre la salsa?",
        "choices": [
          "No sabe exactamente qué lleva.",
          "La preparó él mismo.",
          "Es de su ciudad natal."
        ],
        "correctAnswer": "No sabe exactamente qué lleva."
      },
      {
        "id": "j01-q4",
        "question": "¿Qué hacen los amigos después de comer demasiado?",
        "choices": [
          "Se sientan en un banco a descansar.",
          "Se van directamente de excursión.",
          "Piden una tercera comida."
        ],
        "correctAnswer": "Se sientan en un banco a descansar."
      },
      {
        "id": "j01-q5",
        "question": "¿Qué deciden finalmente?",
        "choices": [
          "Irán en tren y no en taxi.",
          "Pasarán la noche en el aeropuerto.",
          "Alquilarán un coche."
        ],
        "correctAnswer": "Irán en tren y no en taxi."
      }
    ],
    "2": [
      {
        "id": "j02-q1",
        "question": "¿Qué sorprende al amigo de Jeff en el apartamento?",
        "choices": [
          "Una habitación pequeña sirve para varias cosas.",
          "Tiene tres dormitorios de invitados.",
          "No tiene ventanas ni puertas."
        ],
        "correctAnswer": "Una habitación pequeña sirve para varias cosas."
      },
      {
        "id": "j02-q2",
        "question": "¿Por qué estorba la maleta?",
        "choices": [
          "Hay muy poco espacio para moverse.",
          "Tiene las ruedas rotas.",
          "Es del vecino."
        ],
        "correctAnswer": "Hay muy poco espacio para moverse."
      },
      {
        "id": "j02-q3",
        "question": "¿Qué guarda Jeff en carpetas?",
        "choices": [
          "Envoltorios de palillos de distintos diseños.",
          "Solo billetes de tren usados.",
          "Recibos de restaurantes de Estados Unidos."
        ],
        "correctAnswer": "Envoltorios de palillos de distintos diseños."
      },
      {
        "id": "j02-q4",
        "question": "¿Cómo reacciona su amigo ante la colección?",
        "choices": [
          "Le parece raro guardar algo que otros tiran.",
          "Quiere comprar toda la colección.",
          "Dice que tiene la misma afición."
        ],
        "correctAnswer": "Le parece raro guardar algo que otros tiran."
      },
      {
        "id": "j02-q5",
        "question": "¿Qué descubrimiento cierra el capítulo?",
        "choices": [
          "Su amigo descubre un inodoro japonés a ras de suelo.",
          "El piso tiene un balcón oculto.",
          "Jeff tiene otro apartamento."
        ],
        "correctAnswer": "Su amigo descubre un inodoro japonés a ras de suelo."
      }
    ],
    "3": [
      {
        "id": "j03-q1",
        "question": "¿Qué hace memorable la bajada?",
        "choices": [
          "Una foto los capta en un momento poco favorecedor.",
          "Pierden sus abonos de tren.",
          "Ven caer nieve."
        ],
        "correctAnswer": "Una foto los capta en un momento poco favorecedor."
      },
      {
        "id": "j03-q2",
        "question": "¿Quién provoca una carrera escaleras arriba?",
        "choices": [
          "El amigo de Jeff empieza a correr primero.",
          "Un guarda les manda correr.",
          "Jeff se niega a subir."
        ],
        "correctAnswer": "El amigo de Jeff empieza a correr primero."
      },
      {
        "id": "j03-q3",
        "question": "¿Qué atrae al amigo al parque de monos?",
        "choices": [
          "Quiere ver a los monos aunque haya que desviarse.",
          "Lo han contratado allí.",
          "Tiene que recoger un paquete."
        ],
        "correctAnswer": "Quiere ver a los monos aunque haya que desviarse."
      },
      {
        "id": "j03-q4",
        "question": "¿Cómo se comporta el mono joven?",
        "choices": [
          "Sigue molestando a uno mayor aunque lo aparten.",
          "Duerme durante toda la visita.",
          "Sigue a Jeff hasta casa."
        ],
        "correctAnswer": "Sigue molestando a uno mayor aunque lo aparten."
      },
      {
        "id": "j03-q5",
        "question": "¿Qué decide conservar el amigo?",
        "choices": [
          "La foto poco favorecedora del telesilla.",
          "Un zapato perdido en la montaña.",
          "El abono de tren de Jeff."
        ],
        "correctAnswer": "La foto poco favorecedora del telesilla."
      }
    ],
    "4": [
      {
        "id": "j04-q1",
        "question": "¿Qué desconcierta al amigo al abrir el tentempié de arroz?",
        "choices": [
          "El plástico que envuelve el alga.",
          "Un tenedor inesperado dentro.",
          "La falta de una etiqueta de ingredientes."
        ],
        "correctAnswer": "El plástico que envuelve el alga."
      },
      {
        "id": "j04-q2",
        "question": "¿Cómo se prepara el amigo para pedir matcha?",
        "choices": [
          "Ensaya la frase japonesa en el móvil.",
          "Le pide a Jeff que escriba una carta.",
          "Señala la cocina sin hablar."
        ],
        "correctAnswer": "Ensaya la frase japonesa en el móvil."
      },
      {
        "id": "j04-q3",
        "question": "¿Por qué pasan tanto tiempo en el jardín?",
        "choices": [
          "Se quedan sentados en silencio y pierden la noción del tiempo.",
          "La puerta está cerrada.",
          "Esperan un autobús dentro."
        ],
        "correctAnswer": "Se quedan sentados en silencio y pierden la noción del tiempo."
      },
      {
        "id": "j04-q4",
        "question": "¿Qué convence al amigo cansado de ir a las aguas termales?",
        "choices": [
          "Jeff le anima diciendo que allí podrá sentarse.",
          "Es el único camino a casa.",
          "Tiene cita con un médico."
        ],
        "correctAnswer": "Jeff le anima diciendo que allí podrá sentarse."
      },
      {
        "id": "j04-q5",
        "question": "¿Qué interrumpe el sueño del amigo en el tren?",
        "choices": [
          "Jeff lo despierta porque tienen que hacer transbordo.",
          "El revisor anuncia un incendio.",
          "Suena la alarma del móvil a medianoche."
        ],
        "correctAnswer": "Jeff lo despierta porque tienen que hacer transbordo."
      }
    ],
    "5": [
      {
        "id": "j05-q1",
        "question": "¿Qué convierte la estación en un laberinto para ellos?",
        "choices": [
          "Los pasillos se bifurcan y las salidas confunden.",
          "Han quitado todas las señales.",
          "Los trenes se detienen todo el día."
        ],
        "correctAnswer": "Los pasillos se bifurcan y las salidas confunden."
      },
      {
        "id": "j05-q2",
        "question": "¿Qué les ayuda por fin a encontrar la salida correcta?",
        "choices": [
          "Comparan un mapa con los carteles en cada cruce.",
          "Siguen a un desconocido con una bolsa negra.",
          "Piden un taxi desde el subsuelo."
        ],
        "correctAnswer": "Comparan un mapa con los carteles en cada cruce."
      },
      {
        "id": "j05-q3",
        "question": "¿Por qué es importante llegar a la escuela?",
        "choices": [
          "El amigo de Jeff tiene que ocuparse de sus trámites para estudiar japonés.",
          "Van allí a ver un concierto.",
          "Jeff trabaja allí como profesor."
        ],
        "correctAnswer": "El amigo de Jeff tiene que ocuparse de sus trámites para estudiar japonés."
      },
      {
        "id": "j05-q4",
        "question": "¿Qué diferencia nota el amigo en su nuevo alojamiento?",
        "choices": [
          "Su alojamiento tiene cama; Jeff duerme en futón.",
          "No tiene agua corriente.",
          "Está dentro de la biblioteca de la escuela."
        ],
        "correctAnswer": "Su alojamiento tiene cama; Jeff duerme en futón."
      },
      {
        "id": "j05-q5",
        "question": "¿Qué muestra que el amigo empieza a ser independiente?",
        "choices": [
          "Insiste en que puede orientarse con el mapa.",
          "Jeff lleva todo su equipaje a casa.",
          "Vuelve a mudarse al aeropuerto."
        ],
        "correctAnswer": "Insiste en que puede orientarse con el mapa."
      }
    ],
    "6": [
      {
        "id": "j06-q1",
        "question": "¿Por qué grita el cocinero a Jeff?",
        "choices": [
          "Jeff devuelve lechuga a una ensalada después de dejarla en una encimera compartida.",
          "Jeff rompe un plato caro.",
          "Jeff llega tarde al turno."
        ],
        "correctAnswer": "Jeff devuelve lechuga a una ensalada después de dejarla en una encimera compartida."
      },
      {
        "id": "j06-q2",
        "question": "¿Cómo explica Jeff al principio el incidente a un compañero?",
        "choices": [
          "Se centra en que le gritaron mientras preparaba ensaladas.",
          "Dice que va a dimitir de inmediato.",
          "Dice que la comida estaba quemada."
        ],
        "correctAnswer": "Se centra en que le gritaron mientras preparaba ensaladas."
      },
      {
        "id": "j06-q3",
        "question": "¿Por qué es un problema la encimera compartida para una ensalada cruda?",
        "choices": [
          "Antes podría haber habido carne o pescado crudos.",
          "Enfría demasiado la lechuga.",
          "La encimera pertenece a un cliente."
        ],
        "correctAnswer": "Antes podría haber habido carne o pescado crudos."
      },
      {
        "id": "j06-q4",
        "question": "¿Qué pone en duda la sospecha de Jeff de recibir un trato injusto?",
        "choices": [
          "El cocinero también grita al personal japonés.",
          "El cocinero habla inglés perfectamente.",
          "Jeff es el único empleado de la cocina."
        ],
        "correctAnswer": "El cocinero también grita al personal japonés."
      },
      {
        "id": "j06-q5",
        "question": "¿Qué reconoce Jeff antes de volver al trabajo?",
        "choices": [
          "Ya había vuelto a poner comida caída cuando nadie miraba.",
          "No sabe preparar ninguna ensalada.",
          "Ha estado cocinando a escondidas en casa."
        ],
        "correctAnswer": "Ya había vuelto a poner comida caída cuando nadie miraba."
      }
    ],
    "7": [
      {
        "id": "j07-q1",
        "question": "¿Qué llama primero la atención de Jeff en el restaurante?",
        "choices": [
          "Envoltorios de palillos doblados por los clientes.",
          "Una cartera perdida bajo una mesa.",
          "Una carta nueva de postres."
        ],
        "correctAnswer": "Envoltorios de palillos doblados por los clientes."
      },
      {
        "id": "j07-q2",
        "question": "¿Qué intenta hacer Jeff con un envoltorio?",
        "choices": [
          "Un pequeño apoyo para los palillos.",
          "Un sombrero de papel para un niño.",
          "Un recibo de repuesto."
        ],
        "correctAnswer": "Un pequeño apoyo para los palillos."
      },
      {
        "id": "j07-q3",
        "question": "¿Qué dificulta sus intentos?",
        "choices": [
          "Los pliegues no sostienen bien los palillos.",
          "Se ha quedado sin papel.",
          "La cocina está a oscuras."
        ],
        "correctAnswer": "Los pliegues no sostienen bien los palillos."
      },
      {
        "id": "j07-q4",
        "question": "¿Cómo influye la llamada telefónica en su intento?",
        "choices": [
          "Sigue intentándolo mientras habla con su amigo.",
          "Su amigo le ordena tirar el papel.",
          "Sale corriendo a coger un tren."
        ],
        "correctAnswer": "Sigue intentándolo mientras habla con su amigo."
      },
      {
        "id": "j07-q5",
        "question": "¿Qué hace Jeff con el resultado imperfecto?",
        "choices": [
          "Guarda el envoltorio arrugado en su carpeta.",
          "Se lo vende a un cliente.",
          "Lo quema en la cocina."
        ],
        "correctAnswer": "Guarda el envoltorio arrugado en su carpeta."
      }
    ],
    "8": [
      {
        "id": "j08-q1",
        "question": "¿Por qué saca Jeff su apoyo de palillos arrugado?",
        "choices": [
          "Quiere aprender a doblarlo bien.",
          "Quiere devolvérselo a un cliente.",
          "Piensa enviarlo al extranjero."
        ],
        "correctAnswer": "Quiere aprender a doblarlo bien."
      },
      {
        "id": "j08-q2",
        "question": "¿Qué busca Jeff para aprender los pliegues?",
        "choices": [
          "Un libro con modelos de pliegues.",
          "Un libro de recetas de ramen.",
          "Un horario de trenes."
        ],
        "correctAnswer": "Un libro con modelos de pliegues."
      },
      {
        "id": "j08-q3",
        "question": "¿Qué nota al intentar copiar los ejemplos?",
        "choices": [
          "Los pasos son más difíciles de lo que parecían.",
          "El libro tiene las páginas en blanco.",
          "El papel se dobla solo."
        ],
        "correctAnswer": "Los pasos son más difíciles de lo que parecían."
      },
      {
        "id": "j08-q4",
        "question": "¿Por qué deja sin usar un envoltorio limpio al final?",
        "choices": [
          "Lo devuelve a la colección y sigue con el usado.",
          "Es de su jefe.",
          "Lo necesita para escribir una carta."
        ],
        "correctAnswer": "Lo devuelve a la colección y sigue con el usado."
      },
      {
        "id": "j08-q5",
        "question": "¿Qué hace Jeff después de guardar el envoltorio limpio?",
        "choices": [
          "Abre el libro por la página siguiente.",
          "Tira su carpeta.",
          "Se va al aeropuerto."
        ],
        "correctAnswer": "Abre el libro por la página siguiente."
      }
    ],
    "9": [
      {
        "id": "j09-q1",
        "question": "¿Por qué quiere el amigo de Jeff ir a las tiendas regionales?",
        "choices": [
          "Busca una tacita para beber sake.",
          "Necesita una maleta nueva.",
          "Busca un trabajo a tiempo parcial."
        ],
        "correctAnswer": "Busca una tacita para beber sake."
      },
      {
        "id": "j09-q2",
        "question": "¿Qué atrae a Jeff en la tienda de Hokkaido?",
        "choices": [
          "La variedad de ramen regional.",
          "Un expositor de abrigos.",
          "Un libro sobre monos."
        ],
        "correctAnswer": "La variedad de ramen regional."
      },
      {
        "id": "j09-q3",
        "question": "¿Con qué bromean al elegir un paquete?",
        "choices": [
          "Quién cocinará el ramen de verdad.",
          "Quién pagará el tren.",
          "Quién ha perdido una foto."
        ],
        "correctAnswer": "Quién cocinará el ramen de verdad."
      },
      {
        "id": "j09-q4",
        "question": "¿Por qué cuesta elegir la pieza de cerámica?",
        "choices": [
          "A su amigo le gusta una taza gris más cara.",
          "Todas las tazas están rotas.",
          "No pueden entrar en la tienda."
        ],
        "correctAnswer": "A su amigo le gusta una taza gris más cara."
      },
      {
        "id": "j09-q5",
        "question": "¿Qué les impide disfrutar enseguida del ramen en casa?",
        "choices": [
          "Ninguno sabe leer las instrucciones de preparación.",
          "Se olvidaron de comprar el ramen.",
          "Su cocina ha desaparecido."
        ],
        "correctAnswer": "Ninguno sabe leer las instrucciones de preparación."
      }
    ],
    "10": [
      {
        "id": "j10-q1",
        "question": "¿Por qué detiene una vecina a Jeff el día de la basura?",
        "choices": [
          "Ha sacado residuos el día equivocado.",
          "Ha dejado las llaves en el contenedor.",
          "Está bloqueando la calle con una bicicleta."
        ],
        "correctAnswer": "Ha sacado residuos el día equivocado."
      },
      {
        "id": "j10-q2",
        "question": "¿Qué hace Jeff antes de volver a intentarlo?",
        "choices": [
          "Consulta las normas y separa los residuos.",
          "Lo tira todo al río.",
          "Pide ayuda a un taxista."
        ],
        "correctAnswer": "Consulta las normas y separa los residuos."
      },
      {
        "id": "j10-q3",
        "question": "¿Qué relación tiene la mujer con el trabajo de Jeff?",
        "choices": [
          "Su marido es cliente habitual de su izakaya.",
          "Es la dueña del restaurante.",
          "Es hermana del cocinero."
        ],
        "correctAnswer": "Su marido es cliente habitual de su izakaya."
      },
      {
        "id": "j10-q4",
        "question": "¿Qué le sorprende a Jeff de la mujer?",
        "choices": [
          "Antes enseñaba inglés.",
          "No sabe japonés.",
          "Solo habla francés."
        ],
        "correctAnswer": "Antes enseñaba inglés."
      },
      {
        "id": "j10-q5",
        "question": "¿Cómo cambia la actitud de Jeff para el siguiente día de recogida?",
        "choices": [
          "Se ofrece a ayudar a barrer la calle.",
          "Se niega a hablar con la mujer.",
          "Deja las bolsas frente a su puerta."
        ],
        "correctAnswer": "Se ofrece a ayudar a barrer la calle."
      }
    ],
    "11": [
      {
        "id": "j11-q1",
        "question": "¿Por qué acude Jeff a una ventanilla administrativa?",
        "choices": [
          "Tiene trámites que completar y corregir.",
          "Solicita un pasaporte para otro país.",
          "Quiere comprar un abono de tren."
        ],
        "correctAnswer": "Tiene trámites que completar y corregir."
      },
      {
        "id": "j11-q2",
        "question": "¿Qué piensa Jeff al principio de la empleada?",
        "choices": [
          "Le está ayudando a corregir los formularios.",
          "Se niega a atenderlo.",
          "Le pide dinero."
        ],
        "correctAnswer": "Le está ayudando a corregir los formularios."
      },
      {
        "id": "j11-q3",
        "question": "¿Por qué Jeff sigue pensando en una palabra japonesa después?",
        "choices": [
          "Oyó a la empleada decir una palabra que desconocía.",
          "Se ha olvidado de su nombre.",
          "La palabra estaba escrita en un regalo."
        ],
        "correctAnswer": "Oyó a la empleada decir una palabra que desconocía."
      },
      {
        "id": "j11-q4",
        "question": "¿Qué le explica su compañero sobre esa palabra?",
        "choices": [
          "Es una expresión antigua y despectiva.",
          "Es un cumplido formal.",
          "Es un tipo de verdura."
        ],
        "correctAnswer": "Es una expresión antigua y despectiva."
      },
      {
        "id": "j11-q5",
        "question": "¿Qué le cuesta conciliar a Jeff al final?",
        "choices": [
          "La empleada lo ayudó, pero también lo insultó.",
          "Llegó a la estación equivocada.",
          "Sus documentos se perdieron por correo."
        ],
        "correctAnswer": "La empleada lo ayudó, pero también lo insultó."
      }
    ],
    "12": [
      {
        "id": "j12-q1",
        "question": "¿Qué nueva compra le llama la atención a Jeff?",
        "choices": [
          "Una cazuela de barro para cocinar y comer.",
          "Una guitarra eléctrica.",
          "Una bicicleta para su tío."
        ],
        "correctAnswer": "Una cazuela de barro para cocinar y comer."
      },
      {
        "id": "j12-q2",
        "question": "¿Cómo reacciona el amigo de Jeff ante la cazuela?",
        "choices": [
          "Bromea con que Jeff vino por un cuenco y ahora quiere una cazuela.",
          "Dice que la cazuela es ilegal.",
          "Insiste en comprar diez."
        ],
        "correctAnswer": "Bromea con que Jeff vino por un cuenco y ahora quiere una cazuela."
      },
      {
        "id": "j12-q3",
        "question": "¿Qué quiere decir su amigo con ir a ver a «Mama»?",
        "choices": [
          "Van a ver a una mujer que lleva un bar.",
          "Van a visitar a su madre a casa.",
          "Van a una guardería."
        ],
        "correctAnswer": "Van a ver a una mujer que lleva un bar."
      },
      {
        "id": "j12-q4",
        "question": "¿Qué significa «hashigo» en este contexto?",
        "choices": [
          "Ir de un bar a otro.",
          "Subir una montaña con una cuerda.",
          "Pedir comida a domicilio."
        ],
        "correctAnswer": "Ir de un bar a otro."
      },
      {
        "id": "j12-q5",
        "question": "¿Cómo responde Jeff cuando otro cliente le invita a una bebida?",
        "choices": [
          "Le da las gracias y participa en el brindis.",
          "Se marcha sin responder.",
          "Le pide al hombre que se vaya."
        ],
        "correctAnswer": "Le da las gracias y participa en el brindis."
      }
    ],
    "13": [
      {
        "id": "j13-q1",
        "question": "¿Por qué invitan a Jeff al festival?",
        "choices": [
          "Un cliente habitual le pide que ayude a llevar el mikoshi.",
          "Ha ganado un concurso de canto.",
          "El alcalde lo contrata para hacer fotos."
        ],
        "correctAnswer": "Un cliente habitual le pide que ayude a llevar el mikoshi."
      },
      {
        "id": "j13-q2",
        "question": "¿Qué le cuesta a Jeff cuando empieza a moverse el mikoshi?",
        "choices": [
          "Coordinar sus pasos con los demás porteadores.",
          "Encontrar su bicicleta.",
          "Leer el menú."
        ],
        "correctAnswer": "Coordinar sus pasos con los demás porteadores."
      },
      {
        "id": "j13-q3",
        "question": "¿Qué dice el hombre mayor que lleva el mikoshi?",
        "choices": [
          "Una divinidad que llevan por el pueblo para protegerlo.",
          "Un premio al equipo más rápido.",
          "Una colección de platos del restaurante."
        ],
        "correctAnswer": "Una divinidad que llevan por el pueblo para protegerlo."
      },
      {
        "id": "j13-q4",
        "question": "¿A quién reconoce Jeff inesperadamente en el festival?",
        "choices": [
          "Al cocinero que grita en el trabajo.",
          "A su antiguo director de Estados Unidos.",
          "Al piloto de su vuelo."
        ],
        "correctAnswer": "Al cocinero que grita en el trabajo."
      },
      {
        "id": "j13-q5",
        "question": "¿Qué cambia a medida que avanza el día?",
        "choices": [
          "Jeff empieza a moverse mejor al ritmo de los demás.",
          "Jeff abandona el pueblo para siempre.",
          "Jeff se convierte en director del festival."
        ],
        "correctAnswer": "Jeff empieza a moverse mejor al ritmo de los demás."
      }
    ],
    "14": [
      {
        "id": "j14-q1",
        "question": "¿Qué cambia en su regreso al monte Takao?",
        "choices": [
          "Suben andando y bajan en telesilla.",
          "Van en coche y no hacen senderismo.",
          "Se quedan todo el día en la estación."
        ],
        "correctAnswer": "Suben andando y bajan en telesilla."
      },
      {
        "id": "j14-q2",
        "question": "¿Por qué se hacen otra foto en el telesilla?",
        "choices": [
          "Quieren una mejor que la de su primera visita.",
          "La cámara pertenece a un desconocido.",
          "La necesitan para solicitar trabajo."
        ],
        "correctAnswer": "Quieren una mejor que la de su primera visita."
      },
      {
        "id": "j14-q3",
        "question": "¿Qué pequeña incertidumbre queda en el apartamento de Jeff?",
        "choices": [
          "Ya no encuentran uno de los huevos de los peces.",
          "Han vendido el apartamento.",
          "Su amigo ha perdido el pasaporte."
        ],
        "correctAnswer": "Ya no encuentran uno de los huevos de los peces."
      },
      {
        "id": "j14-q4",
        "question": "¿Qué sucede una y otra vez mientras caminan por el barrio?",
        "choices": [
          "Personas que conocen a Jeff lo saludan por su nombre.",
          "Desconocidos les preguntan cómo ir al aeropuerto.",
          "Un policía les ordena marcharse."
        ],
        "correctAnswer": "Personas que conocen a Jeff lo saludan por su nombre."
      },
      {
        "id": "j14-q5",
        "question": "¿Cómo recuerda la última escena su primera comida?",
        "choices": [
          "Acuerdan tomar solo un katsudon cada uno.",
          "Vuelven a pedir tres platos cada uno.",
          "Deciden no volver a comer juntos."
        ],
        "correctAnswer": "Acuerdan tomar solo un katsudon cada uno."
      }
    ]
  },
  "fr": {
    "1": [
      {
        "id": "j01-q1",
        "question": "Pourquoi Jeff finit-il par commander au restaurant de l'aéroport ?",
        "choices": [
          "Son ami n'arrive plus à parler japonais.",
          "Le serveur refuse de servir son ami.",
          "Jeff ne sait pas lire le menu."
        ],
        "correctAnswer": "Son ami n'arrive plus à parler japonais."
      },
      {
        "id": "j01-q2",
        "question": "Qu'est-ce qu'ils commandent et qui finit par être de trop ?",
        "choices": [
          "Un autre bol de katsudon.",
          "Deux bols de soupe.",
          "Un gros gâteau d'anniversaire."
        ],
        "correctAnswer": "Un autre bol de katsudon."
      },
      {
        "id": "j01-q3",
        "question": "Que reconnaît Jeff au sujet de la sauce ?",
        "choices": [
          "Il ne sait pas exactement ce qu'elle contient.",
          "C'est lui qui l'a préparée.",
          "Elle vient de sa ville natale."
        ],
        "correctAnswer": "Il ne sait pas exactement ce qu'elle contient."
      },
      {
        "id": "j01-q4",
        "question": "Que font les deux amis après avoir trop mangé ?",
        "choices": [
          "Ils s'assoient sur un banc pour se reposer.",
          "Ils partent aussitôt faire une randonnée.",
          "Ils commandent un troisième repas."
        ],
        "correctAnswer": "Ils s'assoient sur un banc pour se reposer."
      },
      {
        "id": "j01-q5",
        "question": "Que décident-ils finalement ?",
        "choices": [
          "Ils prendront le train plutôt qu'un taxi.",
          "Ils passeront la nuit à l'aéroport.",
          "Ils loueront une voiture."
        ],
        "correctAnswer": "Ils prendront le train plutôt qu'un taxi."
      }
    ],
    "2": [
      {
        "id": "j02-q1",
        "question": "Qu'est-ce qui surprend l'ami de Jeff dans l'appartement ?",
        "choices": [
          "Une seule petite pièce a plusieurs fonctions.",
          "Il y a trois chambres d'amis.",
          "Il n'a ni fenêtres ni portes."
        ],
        "correctAnswer": "Une seule petite pièce a plusieurs fonctions."
      },
      {
        "id": "j02-q2",
        "question": "Pourquoi la valise les gêne-t-elle ?",
        "choices": [
          "Il y a très peu de place pour circuler.",
          "Ses roues sont cassées.",
          "Elle appartient au voisin."
        ],
        "correctAnswer": "Il y a très peu de place pour circuler."
      },
      {
        "id": "j02-q3",
        "question": "Que collectionne Jeff dans des classeurs ?",
        "choices": [
          "Des pochettes de baguettes aux motifs différents.",
          "Uniquement des billets de train usagés.",
          "Des tickets de restaurant américains."
        ],
        "correctAnswer": "Des pochettes de baguettes aux motifs différents."
      },
      {
        "id": "j02-q4",
        "question": "Comment son ami réagit-il à cette collection ?",
        "choices": [
          "Il trouve étrange de garder ce que les gens jettent.",
          "Il veut acheter toute la collection.",
          "Il dit avoir le même passe-temps."
        ],
        "correctAnswer": "Il trouve étrange de garder ce que les gens jettent."
      },
      {
        "id": "j02-q5",
        "question": "Quelle découverte termine le chapitre ?",
        "choices": [
          "Son ami découvre des toilettes japonaises au sol.",
          "L'appartement possède un balcon caché.",
          "Jeff possède un second appartement."
        ],
        "correctAnswer": "Son ami découvre des toilettes japonaises au sol."
      }
    ],
    "3": [
      {
        "id": "j03-q1",
        "question": "Qu'est-ce qui rend la descente mémorable ?",
        "choices": [
          "Une photo les prend à un moment peu flatteur.",
          "Ils perdent leurs titres de transport.",
          "Ils voient tomber la neige."
        ],
        "correctAnswer": "Une photo les prend à un moment peu flatteur."
      },
      {
        "id": "j03-q2",
        "question": "Qui lance une course dans les escaliers ?",
        "choices": [
          "L'ami de Jeff part en courant le premier.",
          "Un garde les oblige à courir.",
          "Jeff refuse de monter."
        ],
        "correctAnswer": "L'ami de Jeff part en courant le premier."
      },
      {
        "id": "j03-q3",
        "question": "Qu'est-ce qui attire son ami au parc des singes ?",
        "choices": [
          "Il veut voir les singes malgré le détour.",
          "Il y a été embauché.",
          "Il doit récupérer un colis."
        ],
        "correctAnswer": "Il veut voir les singes malgré le détour."
      },
      {
        "id": "j03-q4",
        "question": "Comment se comporte le jeune singe ?",
        "choices": [
          "Il revient embêter un plus grand même après avoir été repoussé.",
          "Il dort pendant toute la visite.",
          "Il suit Jeff jusque chez lui."
        ],
        "correctAnswer": "Il revient embêter un plus grand même après avoir été repoussé."
      },
      {
        "id": "j03-q5",
        "question": "Que choisit de garder son ami ?",
        "choices": [
          "La photo peu flatteuse du télésiège.",
          "Une chaussure perdue en montagne.",
          "Le titre de transport de Jeff."
        ],
        "correctAnswer": "La photo peu flatteuse du télésiège."
      }
    ],
    "4": [
      {
        "id": "j04-q1",
        "question": "Qu'est-ce qui déroute son ami avec l'en-cas au riz ?",
        "choices": [
          "Le film plastique autour de l'algue.",
          "Une fourchette cachée dedans.",
          "L'absence d'une étiquette d'ingrédients."
        ],
        "correctAnswer": "Le film plastique autour de l'algue."
      },
      {
        "id": "j04-q2",
        "question": "Comment son ami se prépare-t-il à commander du matcha ?",
        "choices": [
          "Il répète la phrase japonaise sur son téléphone.",
          "Il demande à Jeff d'écrire une lettre.",
          "Il pointe la cuisine sans parler."
        ],
        "correctAnswer": "Il répète la phrase japonaise sur son téléphone."
      },
      {
        "id": "j04-q3",
        "question": "Pourquoi restent-ils si longtemps dans le jardin ?",
        "choices": [
          "Ils restent assis au calme et perdent la notion du temps.",
          "Le portail est fermé.",
          "Ils attendent un bus à l'intérieur."
        ],
        "correctAnswer": "Ils restent assis au calme et perdent la notion du temps."
      },
      {
        "id": "j04-q4",
        "question": "Qu'est-ce qui convainc son ami fatigué d'aller aux sources chaudes ?",
        "choices": [
          "Jeff lui dit qu'il pourra s'y asseoir.",
          "C'est le seul chemin du retour.",
          "Il a rendez-vous chez un médecin."
        ],
        "correctAnswer": "Jeff lui dit qu'il pourra s'y asseoir."
      },
      {
        "id": "j04-q5",
        "question": "Qu'est-ce qui interrompt le sommeil de son ami dans le train ?",
        "choices": [
          "Jeff le réveille pour changer de train.",
          "Un contrôleur annonce un incendie.",
          "Son téléphone sonne à minuit."
        ],
        "correctAnswer": "Jeff le réveille pour changer de train."
      }
    ],
    "5": [
      {
        "id": "j05-q1",
        "question": "Pourquoi la gare devient-elle un labyrinthe pour les deux amis ?",
        "choices": [
          "Les couloirs se divisent et les sorties prêtent à confusion.",
          "Tous les panneaux ont été retirés.",
          "Les trains sont arrêtés toute la journée."
        ],
        "correctAnswer": "Les couloirs se divisent et les sorties prêtent à confusion."
      },
      {
        "id": "j05-q2",
        "question": "Qu'est-ce qui leur permet enfin de trouver la bonne sortie ?",
        "choices": [
          "Ils comparent un plan aux panneaux à chaque embranchement.",
          "Ils suivent un inconnu avec un sac noir.",
          "Ils appellent un taxi depuis le sous-sol."
        ],
        "correctAnswer": "Ils comparent un plan aux panneaux à chaque embranchement."
      },
      {
        "id": "j05-q3",
        "question": "Pourquoi leur arrivée à l'école est-elle importante ?",
        "choices": [
          "L'ami de Jeff doit régler les formalités de ses cours de japonais.",
          "Ils vont y voir un concert.",
          "Jeff y travaille comme professeur."
        ],
        "correctAnswer": "L'ami de Jeff doit régler les formalités de ses cours de japonais."
      },
      {
        "id": "j05-q4",
        "question": "Quel contraste son ami remarque-t-il dans son nouveau logement ?",
        "choices": [
          "Il a un lit, tandis que Jeff dort sur un futon.",
          "Il n'a pas d'eau courante.",
          "Il se trouve dans la bibliothèque de l'école."
        ],
        "correctAnswer": "Il a un lit, tandis que Jeff dort sur un futon."
      },
      {
        "id": "j05-q5",
        "question": "Qu'est-ce qui montre que son ami devient plus autonome à la fin ?",
        "choices": [
          "Il affirme pouvoir retrouver son chemin avec le plan.",
          "Jeff rapporte tous ses bagages chez lui.",
          "Il retourne habiter à l'aéroport."
        ],
        "correctAnswer": "Il affirme pouvoir retrouver son chemin avec le plan."
      }
    ],
    "6": [
      {
        "id": "j06-q1",
        "question": "Pourquoi le cuisinier crie-t-il sur Jeff ?",
        "choices": [
          "Jeff remet de la salade après l'avoir posée sur un plan de travail partagé.",
          "Jeff casse une assiette coûteuse.",
          "Jeff arrive en retard au service."
        ],
        "correctAnswer": "Jeff remet de la salade après l'avoir posée sur un plan de travail partagé."
      },
      {
        "id": "j06-q2",
        "question": "Comment Jeff raconte-t-il d'abord l'incident à un collègue ?",
        "choices": [
          "Il insiste sur le fait qu'on lui a crié dessus pendant qu'il préparait des salades.",
          "Il dit qu'il démissionne sur-le-champ.",
          "Il dit que le plat avait brûlé."
        ],
        "correctAnswer": "Il insiste sur le fait qu'on lui a crié dessus pendant qu'il préparait des salades."
      },
      {
        "id": "j06-q3",
        "question": "Pourquoi le plan de travail partagé pose-t-il problème pour une salade crue ?",
        "choices": [
          "De la viande ou du poisson crus ont pu y être posés.",
          "Il rend la salade trop froide.",
          "Le plan de travail appartient à un client."
        ],
        "correctAnswer": "De la viande ou du poisson crus ont pu y être posés."
      },
      {
        "id": "j06-q4",
        "question": "Qu'est-ce qui complique les soupçons de Jeff sur son traitement ?",
        "choices": [
          "Le cuisinier crie aussi sur les employés japonais.",
          "Le cuisinier parle parfaitement anglais.",
          "Jeff est le seul employé de la cuisine."
        ],
        "correctAnswer": "Le cuisinier crie aussi sur les employés japonais."
      },
      {
        "id": "j06-q5",
        "question": "Qu'avoue Jeff avant de reprendre le travail ?",
        "choices": [
          "Il a déjà remis des aliments tombés quand personne ne regardait.",
          "Il ne sait préparer aucune salade.",
          "Il cuisinait en cachette chez lui."
        ],
        "correctAnswer": "Il a déjà remis des aliments tombés quand personne ne regardait."
      }
    ],
    "7": [
      {
        "id": "j07-q1",
        "question": "Qu'est-ce qui attire d'abord l'attention de Jeff au restaurant ?",
        "choices": [
          "Des pochettes de baguettes pliées par des clients.",
          "Un portefeuille perdu sous une table.",
          "Une nouvelle carte des desserts."
        ],
        "correctAnswer": "Des pochettes de baguettes pliées par des clients."
      },
      {
        "id": "j07-q2",
        "question": "Qu'essaie de fabriquer Jeff avec une pochette ?",
        "choices": [
          "Un petit repose-baguettes.",
          "Un chapeau en papier pour un enfant.",
          "Un ticket de caisse de remplacement."
        ],
        "correctAnswer": "Un petit repose-baguettes."
      },
      {
        "id": "j07-q3",
        "question": "Qu'est-ce qui rend ses essais difficiles ?",
        "choices": [
          "Les plis ne maintiennent pas les baguettes correctement.",
          "Il n'a plus de papier.",
          "La cuisine est plongée dans le noir."
        ],
        "correctAnswer": "Les plis ne maintiennent pas les baguettes correctement."
      },
      {
        "id": "j07-q4",
        "question": "Quel effet l'appel téléphonique a-t-il sur sa tentative ?",
        "choices": [
          "Il continue d'essayer en parlant avec son ami.",
          "Son ami lui ordonne de jeter le papier.",
          "Il part prendre un train."
        ],
        "correctAnswer": "Il continue d'essayer en parlant avec son ami."
      },
      {
        "id": "j07-q5",
        "question": "Que fait Jeff de son résultat imparfait ?",
        "choices": [
          "Il range la pochette froissée dans son classeur.",
          "Il la vend à un client.",
          "Il la brûle dans la cuisine."
        ],
        "correctAnswer": "Il range la pochette froissée dans son classeur."
      }
    ],
    "8": [
      {
        "id": "j08-q1",
        "question": "Pourquoi Jeff ressort-il son repose-baguettes froissé ?",
        "choices": [
          "Il veut apprendre à le plier correctement.",
          "Il veut le rendre à un client.",
          "Il compte l'envoyer à l'étranger."
        ],
        "correctAnswer": "Il veut apprendre à le plier correctement."
      },
      {
        "id": "j08-q2",
        "question": "Que cherche Jeff pour comprendre les plis ?",
        "choices": [
          "Un livre avec des modèles de pliage.",
          "Un livre de recettes de ramen.",
          "Un horaire de train."
        ],
        "correctAnswer": "Un livre avec des modèles de pliage."
      },
      {
        "id": "j08-q3",
        "question": "Que remarque-t-il en essayant de reproduire les modèles ?",
        "choices": [
          "Les étapes sont plus difficiles qu'elles n'en avaient l'air.",
          "Les pages du livre sont blanches.",
          "Le papier se plie tout seul."
        ],
        "correctAnswer": "Les étapes sont plus difficiles qu'elles n'en avaient l'air."
      },
      {
        "id": "j08-q4",
        "question": "Pourquoi Jeff laisse-t-il une pochette propre de côté à la fin ?",
        "choices": [
          "Il la remet dans sa collection et continue avec celle qui est usée.",
          "Elle appartient à son patron.",
          "Il en a besoin pour écrire une lettre."
        ],
        "correctAnswer": "Il la remet dans sa collection et continue avec celle qui est usée."
      },
      {
        "id": "j08-q5",
        "question": "Que fait Jeff après avoir rangé la pochette propre ?",
        "choices": [
          "Il ouvre le livre à la page suivante.",
          "Il jette son classeur.",
          "Il part pour l'aéroport."
        ],
        "correctAnswer": "Il ouvre le livre à la page suivante."
      }
    ],
    "9": [
      {
        "id": "j09-q1",
        "question": "Pourquoi l'ami de Jeff veut-il visiter les boutiques régionales ?",
        "choices": [
          "Il cherche une petite tasse pour boire du saké.",
          "Il lui faut une nouvelle valise.",
          "Il cherche un petit boulot."
        ],
        "correctAnswer": "Il cherche une petite tasse pour boire du saké."
      },
      {
        "id": "j09-q2",
        "question": "Qu'est-ce qui attire Jeff dans la boutique de Hokkaido ?",
        "choices": [
          "Le choix de ramens régionaux.",
          "Un rayon de manteaux d'hiver.",
          "Un livre sur les singes."
        ],
        "correctAnswer": "Le choix de ramens régionaux."
      },
      {
        "id": "j09-q3",
        "question": "De quoi plaisantent-ils en choisissant un paquet ?",
        "choices": [
          "Qui va vraiment cuisiner les ramens.",
          "Qui paiera le train.",
          "Qui a perdu une photo."
        ],
        "correctAnswer": "Qui va vraiment cuisiner les ramens."
      },
      {
        "id": "j09-q4",
        "question": "Pourquoi le choix de la poterie est-il difficile ?",
        "choices": [
          "Son ami aime une tasse grise plus chère.",
          "Toutes les tasses sont cassées.",
          "Ils ne peuvent pas entrer dans la boutique."
        ],
        "correctAnswer": "Son ami aime une tasse grise plus chère."
      },
      {
        "id": "j09-q5",
        "question": "Qu'est-ce qui les empêche de préparer tout de suite les ramens chez eux ?",
        "choices": [
          "Aucun des deux ne sait lire les instructions de cuisson.",
          "Ils ont oublié d'acheter les ramens.",
          "Leur cuisinière a disparu."
        ],
        "correctAnswer": "Aucun des deux ne sait lire les instructions de cuisson."
      }
    ],
    "10": [
      {
        "id": "j10-q1",
        "question": "Pourquoi une voisine arrête-t-elle Jeff le jour des poubelles ?",
        "choices": [
          "Il a sorti des déchets le mauvais jour.",
          "Il a laissé ses clés dans la poubelle.",
          "Il bloque la rue avec un vélo."
        ],
        "correctAnswer": "Il a sorti des déchets le mauvais jour."
      },
      {
        "id": "j10-q2",
        "question": "Que fait Jeff avant de réessayer ?",
        "choices": [
          "Il vérifie les consignes et trie son sac.",
          "Il jette tout dans la rivière.",
          "Il demande de l'aide à un chauffeur de taxi."
        ],
        "correctAnswer": "Il vérifie les consignes et trie son sac."
      },
      {
        "id": "j10-q3",
        "question": "Quel lien la femme a-t-elle avec le travail de Jeff ?",
        "choices": [
          "Son mari est un habitué de son izakaya.",
          "Elle possède le restaurant.",
          "Elle est la sœur du cuisinier."
        ],
        "correctAnswer": "Son mari est un habitué de son izakaya."
      },
      {
        "id": "j10-q4",
        "question": "Qu'est-ce qui surprend Jeff chez cette femme ?",
        "choices": [
          "Elle enseignait autrefois l'anglais.",
          "Elle ne parle pas japonais.",
          "Elle ne parle que français."
        ],
        "correctAnswer": "Elle enseignait autrefois l'anglais."
      },
      {
        "id": "j10-q5",
        "question": "Comment Jeff a-t-il changé au jour de collecte suivant ?",
        "choices": [
          "Il propose d'aider à balayer la rue.",
          "Il refuse de parler à la femme.",
          "Il laisse les sacs devant sa porte."
        ],
        "correctAnswer": "Il propose d'aider à balayer la rue."
      }
    ],
    "11": [
      {
        "id": "j11-q1",
        "question": "Pourquoi Jeff se rend-il à un guichet administratif ?",
        "choices": [
          "Il doit remplir et corriger des documents.",
          "Il demande un passeport pour un autre pays.",
          "Il veut acheter un abonnement de train."
        ],
        "correctAnswer": "Il doit remplir et corriger des documents."
      },
      {
        "id": "j11-q2",
        "question": "Que pense d'abord Jeff de l'employée ?",
        "choices": [
          "Elle l'aide à corriger ses formulaires.",
          "Elle refuse de le recevoir.",
          "Elle lui demande de l'argent."
        ],
        "correctAnswer": "Elle l'aide à corriger ses formulaires."
      },
      {
        "id": "j11-q3",
        "question": "Pourquoi Jeff repense-t-il à un mot japonais ensuite ?",
        "choices": [
          "Il a entendu l'employée dire un mot qu'il ne connaissait pas.",
          "Il a oublié son nom.",
          "Le mot était écrit sur un cadeau."
        ],
        "correctAnswer": "Il a entendu l'employée dire un mot qu'il ne connaissait pas."
      },
      {
        "id": "j11-q4",
        "question": "Qu'explique son collègue à propos de ce mot ?",
        "choices": [
          "C'est une expression vieillie et insultante.",
          "C'est un compliment formel.",
          "C'est une sorte de légume."
        ],
        "correctAnswer": "C'est une expression vieillie et insultante."
      },
      {
        "id": "j11-q5",
        "question": "Qu'est-ce que Jeff a du mal à concilier à la fin ?",
        "choices": [
          "L'employée l'a aidé tout en l'insultant.",
          "Il est arrivé à la mauvaise gare.",
          "Ses documents ont été perdus par la poste."
        ],
        "correctAnswer": "L'employée l'a aidé tout en l'insultant."
      }
    ],
    "12": [
      {
        "id": "j12-q1",
        "question": "Quel nouvel achat attire l'attention de Jeff ?",
        "choices": [
          "Une marmite en terre pour cuisiner et manger.",
          "Une guitare électrique.",
          "Un vélo pour son oncle."
        ],
        "correctAnswer": "Une marmite en terre pour cuisiner et manger."
      },
      {
        "id": "j12-q2",
        "question": "Comment l'ami de Jeff réagit-il à la marmite ?",
        "choices": [
          "Il plaisante : Jeff était venu pour un bol, et voilà qu'il veut une marmite.",
          "Il dit que la marmite est interdite.",
          "Il insiste pour en acheter dix."
        ],
        "correctAnswer": "Il plaisante : Jeff était venu pour un bol, et voilà qu'il veut une marmite."
      },
      {
        "id": "j12-q3",
        "question": "Que veut dire son ami quand il propose d'aller voir « Mama » ?",
        "choices": [
          "Ils vont voir une femme qui tient un bar.",
          "Ils vont rendre visite à sa mère.",
          "Ils vont dans une crèche."
        ],
        "correctAnswer": "Ils vont voir une femme qui tient un bar."
      },
      {
        "id": "j12-q4",
        "question": "Que signifie « hashigo » ici ?",
        "choices": [
          "Passer d'un bar à un autre.",
          "Gravir une montagne avec une corde.",
          "Commander un repas à domicile."
        ],
        "correctAnswer": "Passer d'un bar à un autre."
      },
      {
        "id": "j12-q5",
        "question": "Comment Jeff réagit-il lorsqu'un client lui offre un verre ?",
        "choices": [
          "Il le remercie et trinque avec lui.",
          "Il part sans répondre.",
          "Il demande à l'homme de partir."
        ],
        "correctAnswer": "Il le remercie et trinque avec lui."
      }
    ],
    "13": [
      {
        "id": "j13-q1",
        "question": "Pourquoi Jeff est-il invité à la fête ?",
        "choices": [
          "Un habitué lui demande d'aider à porter le mikoshi.",
          "Il a gagné un concours de chant.",
          "Le maire l'engage comme photographe."
        ],
        "correctAnswer": "Un habitué lui demande d'aider à porter le mikoshi."
      },
      {
        "id": "j13-q2",
        "question": "Qu'est-ce qui est le plus difficile pour Jeff quand le mikoshi démarre ?",
        "choices": [
          "Accorder ses pas avec ceux des autres porteurs.",
          "Retrouver son vélo.",
          "Lire le menu."
        ],
        "correctAnswer": "Accorder ses pas avec ceux des autres porteurs."
      },
      {
        "id": "j13-q3",
        "question": "Que dit l'homme âgé sur ce que transporte le mikoshi ?",
        "choices": [
          "Une divinité promenée dans le quartier pour le protéger.",
          "Un prix pour l'équipe la plus rapide.",
          "Une collection d'assiettes du restaurant."
        ],
        "correctAnswer": "Une divinité promenée dans le quartier pour le protéger."
      },
      {
        "id": "j13-q4",
        "question": "Qui Jeff reconnaît-il à la fête, à sa surprise ?",
        "choices": [
          "Le cuisinier qui crie au travail.",
          "Son ancien directeur d'école américain.",
          "Le pilote de son avion."
        ],
        "correctAnswer": "Le cuisinier qui crie au travail."
      },
      {
        "id": "j13-q5",
        "question": "Qu'est-ce qui change au fil de la journée ?",
        "choices": [
          "Jeff arrive peu à peu à mieux suivre le rythme des porteurs.",
          "Jeff quitte définitivement le quartier.",
          "Jeff devient le directeur de la fête."
        ],
        "correctAnswer": "Jeff arrive peu à peu à mieux suivre le rythme des porteurs."
      }
    ],
    "14": [
      {
        "id": "j14-q1",
        "question": "Qu'est-ce qui change lors de leur retour au mont Takao ?",
        "choices": [
          "Ils montent à pied et redescendent en télésiège.",
          "Ils y vont en voiture sans marcher.",
          "Ils restent toute la journée à la gare."
        ],
        "correctAnswer": "Ils montent à pied et redescendent en télésiège."
      },
      {
        "id": "j14-q2",
        "question": "Pourquoi les deux amis reprennent-ils une photo sur le télésiège ?",
        "choices": [
          "Ils en veulent une meilleure que lors de leur première visite.",
          "L'appareil appartient à un inconnu.",
          "Ils en ont besoin pour une candidature."
        ],
        "correctAnswer": "Ils en veulent une meilleure que lors de leur première visite."
      },
      {
        "id": "j14-q3",
        "question": "Quelle petite incertitude demeure dans l'appartement de Jeff ?",
        "choices": [
          "L'un des œufs de poisson est introuvable.",
          "L'appartement a été vendu.",
          "Son ami a perdu son passeport."
        ],
        "correctAnswer": "L'un des œufs de poisson est introuvable."
      },
      {
        "id": "j14-q4",
        "question": "Que se passe-t-il à plusieurs reprises lorsqu'ils traversent le quartier ?",
        "choices": [
          "Des personnes qui connaissent Jeff l'appellent par son prénom.",
          "Des inconnus leur demandent le chemin de l'aéroport.",
          "Un policier leur ordonne de partir."
        ],
        "correctAnswer": "Des personnes qui connaissent Jeff l'appellent par son prénom."
      },
      {
        "id": "j14-q5",
        "question": "Comment la dernière scène rappelle-t-elle leur premier repas ?",
        "choices": [
          "Ils conviennent de ne prendre qu'un katsudon chacun.",
          "Ils commandent de nouveau trois repas chacun.",
          "Ils décident de ne plus jamais manger ensemble."
        ],
        "correctAnswer": "Ils conviennent de ne prendre qu'un katsudon chacun."
      }
    ]
  }
};

export function getJeffQuestions(language: JeffLanguage, episode: number): readonly ReadingQuestion[] {
  return bank[language][String(episode)] ?? [];
}
