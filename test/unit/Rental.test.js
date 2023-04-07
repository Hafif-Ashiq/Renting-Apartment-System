const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers } = require("hardhat")

describe("Rental Unit Tests", () => {
    let rentalContract, deployer

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        rentalContract = await ethers.getContract("RentalContract", deployer)
        // console.log(rentalContract);
        // console.log(deployer);
        // console.log(rentalContract.getBalance());
    })
    ////////////////// Constructor //////////////////
    describe("Constructor", async () => {
        it("Sets Owner to deployer address", async () => {
            let owner = await rentalContract.getOwner()
            assert.equal(owner.toString(), deployer.toString())
        })
    })

    ////////////////// Add Apartment //////////////////

    describe("Add Apartment", () => {
        beforeEach(async () => {
            let apartmentID = 1
            let landlord = deployer
            let rentAmount = 1200
            let advancePayment = 1400
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)
        })

        // it("Doesn't work if the owner doesn't call the function", () => {});

        it("doesn't add apartment if the apartment with same id Exists", async () => {
            let apartmentID = 1
            let landlord = deployer
            let rentAmount = 1200
            let advancePayment = 1400

            expect(
                rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)
            ).to.be.revertedWith("The Apartment already exists")
        })
        it("adds an appartment ", async () => {
            let apartmentID = 2
            let landlord = deployer
            let rentAmount = 1200
            let advancePayment = 1400
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)

            let addedApartment = await rentalContract.getApartment(2)
            // let a_id = addedApartment.deployer;
            assert.equal(landlord, addedApartment.landlord)
            assert.equal(
                "0x0000000000000000000000000000000000000000",
                addedApartment.renter.toString()
            )
            assert.equal("false", addedApartment.isRented.toString())
            assert.equal(rentAmount, addedApartment.rentAmount)
            assert.equal("0", addedApartment.rentalPeriod.toString())
            assert.equal(advancePayment, addedApartment.advancePayment)
            assert.equal("0", addedApartment.balance.toString())
        })
    })

    ////////////////// Delete Apartment //////////////////

    describe("Delete Department", async () => {
        let apartmentID, landlord, rentAmount, advancePayment
        beforeEach(async () => {
            apartmentID = 1
            landlord = (await getNamedAccounts()).landlord
            rentAmount = 1200
            advancePayment = 1400
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)
        })

        it("Deletes the apartment with help of apartment id", async () => {
            await rentalContract.deleteApartment(apartmentID)
            expect(rentalContract.getApartment(apartmentID)).to.be.revertedWith(
                "Apartment doesn't exist"
            )
        })
    })

    ////////////////// Rent Apartment //////////////////

    describe("Rent Apartmnent", async () => {
        let apartmentID, landlord, rentAmount, advancePayment, renter, rentalPeriod

        beforeEach(async () => {
            apartmentID = 1
            landlord = (await getNamedAccounts()).landlord
            rentAmount = 1200
            advancePayment = 1400
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)
        })

        it("checks if the amount sent is low than expected", async () => {
            renter = getNamedAccounts().renter
            rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years
            expect(
                rentalContract.rentApartment(apartmentID, renter, rentalPeriod, { value: 0 })
            ).to.be.revertedWith("The amount sent is low")
        })

        describe("isRented in function Rent Apartment", async () => {
            beforeEach(async () => {
                renter = (await getNamedAccounts()).renter
                rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years

                await rentalContract.rentApartment(apartmentID, renter, rentalPeriod, {
                    value: rentAmount + advancePayment,
                })
            })
            it("checks if the apartment is already rented", async () => {
                expect(
                    rentalContract.rentApartment(apartmentID, renter, rentalPeriod)
                ).to.be.rejectedWith("The apartment is already rented")
                assert(true)
            })
        })

        it("the apartment is rented and it's status changes", async () => {
            renter = (await getNamedAccounts()).renter
            rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years
            await rentalContract.rentApartment(apartmentID, renter, rentalPeriod, {
                value: rentAmount + advancePayment,
            })
            // const timestampBefore = Math.floor(Date.now() / 1000)
            rentedApartment = await rentalContract.getApartment(apartmentID)
            // const timestampAfter = Math.floor(Date.now() / 1000)

            assert.equal(renter, rentedApartment.renter.toString())
            assert.equal(rentalPeriod, rentedApartment.rentalPeriod.toString())
            assert.equal("true", rentedApartment.isRented.toString())

            assert.equal(rentAmount + advancePayment, rentedApartment.balance.toString())
        })
    })

    ////////////////// Make Rent Payment //////////////////

    describe("Make Rent Payment", async () => {
        let apartmentID, landlord, rentAmount, advancePayment, renter, rentalPeriod, renterContract

        beforeEach(async () => {
            apartmentID = 1
            landlord = (await getNamedAccounts()).landlord
            rentAmount = 1200
            advancePayment = 1400
            renter = (await getNamedAccounts()).renter
            rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)

            await rentalContract.rentApartment(apartmentID, renter, rentalPeriod, {
                value: rentAmount + advancePayment,
            })
            const renter2 = (await ethers.getSigners())[2]
            renterContract = await rentalContract.connect(renter2)

            await network.provider.send("evm_increaseTime", [2592002])
            await network.provider.request({ method: "evm_mine", params: [] })
        })

        it("doesn't let pay if you're not renter", async () => {
            // let accounts = await ethers.getSigners()

            expect(rentalContract.makeRentPayment(apartmentID)).to.be.revertedWith(
                "You do not rent this apartment"
            )
        })

        it("doesn't let pay if the amount is not exactly equal", async () => {
            expect(renterContract.makeRentPayment(apartmentID)).to.be.revertedWith(
                "The amount you sent is not correct"
            )
        })

        it("updates the balance present in the apartment's account", async () => {
            let prevBalance = await rentalContract.getApartmentBalance(apartmentID)

            await renterContract.makeRentPayment(apartmentID, { value: rentAmount })
            let updatedBalance = await rentalContract.getApartmentBalance(apartmentID)
            assert.equal(
                (parseInt(prevBalance.toString()) + rentAmount).toString(),
                updatedBalance.toString()
            )
        })
    })

    ////////////////// Withdraw Funds //////////////////

    describe("Withdraw Funds", async () => {
        let apartmentID,
            landlord,
            rentAmount,
            advancePayment,
            renter,
            rentalPeriod,
            landlordContract

        beforeEach(async () => {
            apartmentID = 1
            landlord = (await getNamedAccounts()).landlord
            rentAmount = 1200
            advancePayment = 1400
            renter = (await getNamedAccounts()).renter
            rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)

            await rentalContract.rentApartment(apartmentID, renter, rentalPeriod, {
                value: rentAmount + advancePayment,
            })

            const lan = await ethers.getSigner(landlord)
            landlordContract = rentalContract.connect(lan)
        })

        it("Doesn't allow withdrawl other than landlord", async () => {
            expect(rentalContract.withdrawFunds(apartmentID)).to.be.revertedWith(
                "You are not landlord of this apartment"
            )
        })

        it("Transfers the rent amount only to landlord", async () => {
            const prevBalance = (await ethers.getSigner(landlord)).getBalance()
            const prevApartmentBalance = await rentalContract.getApartmentBalance(apartmentID)
            const rentInBalance = prevApartmentBalance - advancePayment
            await landlordContract.withdrawFunds(apartmentID)

            const updatedBalance = (await ethers.getSigner(landlord)).getBalance()
            const updatedApartmentBalance = await rentalContract.getApartmentBalance(apartmentID)

            // console.log((await updatedBalance).toString())
            // console.log((await prevBalance).toString())
            assert.equal(updatedApartmentBalance, advancePayment)
        })
    })

    ////////////////// End Rental Contract //////////////////

    describe("End Rental Contract", async () => {
        let apartmentID,
            landlord,
            rentAmount,
            advancePayment,
            renter,
            rentalPeriod,
            landlordContract

        beforeEach(async () => {
            apartmentID = 1
            landlord = (await getNamedAccounts()).landlord
            rentAmount = 1200
            advancePayment = 1400
            renter = (await getNamedAccounts()).renter
            rentalPeriod = 4 * 365 * 24 * 60 * 60 // 4 years
            // await rentalContract.addApartment();
            await rentalContract.addApartment(apartmentID, landlord, rentAmount, advancePayment)

            await rentalContract.rentApartment(apartmentID, renter, rentalPeriod, {
                value: rentAmount + advancePayment,
            })
        })

        it("doesn't perform if you're not the renter", async () => {
            // let accounts = await ethers.getSigners()

            expect(rentalContract.makeRentPayment(apartmentID)).to.be.revertedWith(
                "You're not renter of the apartment"
            )
        })

        it("transfers funds to renter", async () => {
            const ethRenter = await ethers.getSigner(renter)
            const rentersContract = await rentalContract.connect(ethRenter)
            const prevBalance = await ethRenter.getBalance()

            await network.provider.send("evm_increaseTime", [rentalPeriod + 1])
            await network.provider.request({ method: "evm_mine", params: [] })

            await rentersContract.endRentalContract(apartmentID)

            const updatedBalance = await ethRenter.getBalance()

            // console.log(prevBalance.toString())
            // console.log(updatedBalance.toString())

            // assert.equal(
            //     prevBalance.add(advancePayment.toString()).toString(),
            //     updatedBalance.toString()
            // )
            let addedApartment = await rentalContract.getApartment(apartmentID)
            // let a_id = addedApartment.deployer;
            assert.equal(landlord, addedApartment.landlord)
            assert.equal(
                "0x0000000000000000000000000000000000000000",
                addedApartment.renter.toString()
            )
            assert.equal("false", addedApartment.isRented.toString())
            assert.equal(rentAmount, addedApartment.rentAmount)
            assert.equal("0", addedApartment.rentalPeriod.toString())
            assert.equal(advancePayment, addedApartment.advancePayment)
            assert.equal("0", addedApartment.balance.toString())
        })
    })
})
