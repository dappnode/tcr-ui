import React, { Component } from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { createStructuredSelector } from 'reselect'

import {
  selectAccount,
  selectBalances,
  selectTCR,
  selectRegistry,
  selectVoting,
  selectParameters,
} from 'modules/home/selectors'
import { selectMiningStatus, selectLatestTxn } from 'modules/transactions/selectors'
import { selectSidePanelListing, selectSidePanelMethod } from 'modules/listings/selectors'
import * as liActions from 'modules/listings/actions'
import * as txActions from 'modules/transactions/actions'

import { convertedToBaseUnit, BN, baseToConvertedUnit } from 'libs/units'

import toJS from 'components/toJS'
import Apply from 'containers/Transactions/Apply'
import Transfer from 'containers/Transactions/Transfer'
import NoBalance from 'containers/Transactions/NoBalance'
import Challenge from 'containers/Transactions/Challenge'
import CommitVote from 'containers/Transactions/CommitVote'
import RevealVote from 'containers/Transactions/RevealVote'
import UpdateStatus from 'containers/Transactions/UpdateStatus'
import ClaimReward from 'containers/Transactions/ClaimReward'

import styled from 'styled-components'

const TransactionsWrapper = styled.div`
  width: 100vw;
`
class Transactions extends Component {
  state = {
    listingID: '',
    data: '',
    numTokens: '',
    transferTo: '',
    fileInput: false,
    visibleApprove: true,
    depositMore: false,
  }
  closeSidePanel = () => {
    this.props.onOpenSidePanel({}, '')
  }
  showApprove = () => {
    this.setState({ visibleApprove: true })
  }
  handleFileInput = e => {
    const file = e.target.files[0]
    const fr = new window.FileReader()

    fr.onload = () => {
      const contents = fr.result
      const json = JSON.parse(contents)

      try {
        this.setState({
          fileInput: json,
        })
      } catch (error) {
        throw new Error('Invalid Commit JSON file')
      }
      // this.getVoterReward(json.pollID, json.salt)
    }
    fr.readAsText(file)
  }
  handleInputChange = (e, t) => {
    this.setState({
      [t]: e.target.value,
    })
  }

  render() {
    const {
      balances,
      account,
      tcr,
      parameters,
      sidePanelListing,
      sidePanelMethod,
      children,
      voting,
      registry,
    } = this.props

    const needToApproveRegistry = BN(balances.registryAllowance).lt(
      BN(baseToConvertedUnit(parameters.minDeposit, tcr.tokenDecimals))
    )
    const needToApproveVoting = balances.votingAllowance === '0.0'

    return (
      <TransactionsWrapper>
        {children}

        {balances.token === '0.0' ? (
          <NoBalance
            opened={sidePanelMethod !== ''}
            closeSidePanel={this.closeSidePanel}
            handleInputChange={this.handleInputChange}
            {...this.props}
          />
        ) : (
          <div>
            <Transfer
              opened={sidePanelMethod === 'transfer'}
              closeSidePanel={this.closeSidePanel}
              handleInputChange={this.handleInputChange}
              handleTransfer={this.handleTransfer}
              {...this.props}
            />
            <Apply
              opened={sidePanelMethod === 'apply'}
              needToApprove={needToApproveRegistry}
              depositMore={this.state.depositMore}
              visibleApprove={this.state.visibleApprove}
              closeSidePanel={this.closeSidePanel}
              handleInputChange={this.handleInputChange}
              handleApprove={this.handleApprove}
              handleApply={this.handleApply}
              showApprove={this.showApprove}
              {...this.props}
            />
            <Challenge
              opened={sidePanelMethod === 'challenge'}
              closeSidePanel={this.closeSidePanel}
              tcr={tcr}
              parameters={parameters}
              selectedOne={sidePanelListing}
              needToApprove={needToApproveRegistry}
              handleInputChange={this.handleInputChange}
              handleApprove={this.handleApprove}
              handleChallenge={this.handleChallenge}
            />
            {sidePanelMethod === 'commitVote' && (
              <CommitVote
                selectedOne={sidePanelListing}
                opened={sidePanelMethod === 'commitVote'}
                needToApprove={needToApproveVoting}
                closeSidePanel={this.closeSidePanel}
                handleInputChange={this.handleInputChange}
                handleApprove={this.handleApprove}
                handleCommitVote={this.handleCommitVote}
                showApprove={this.showApprove}
                numTokens={this.state.numTokens}
                balances={balances}
                account={account}
                tcr={tcr}
                voting={voting}
                registry={registry}
              />
            )}
            {sidePanelMethod === 'revealVote' && (
              <RevealVote
                selectedOne={sidePanelListing}
                opened={sidePanelMethod === 'revealVote'}
                closeSidePanel={this.closeSidePanel}
                handleFileInput={this.handleFileInput}
                handleRevealVote={this.handleRevealVote}
                balances={balances}
                account={account}
                tcr={tcr}
                voting={voting}
                registry={registry}
              />
            )}
            {sidePanelMethod === 'claimReward' && (
              <ClaimReward
                selectedOne={sidePanelListing}
                opened={sidePanelMethod === 'claimReward'}
                closeSidePanel={this.closeSidePanel}
                handleFileInput={this.handleFileInput}
                handleClaimReward={this.handleClaimReward}
                balances={balances}
                account={account}
                tcr={tcr}
                voting={voting}
                registry={registry}
              />
            )}
          </div>
        )}
        <UpdateStatus
          selectedOne={sidePanelListing}
          opened={sidePanelMethod === 'updateStatus'}
          closeSidePanel={this.closeSidePanel}
          handleFileInput={this.handleFileInput}
          handleUpdateStatus={this.handleUpdateStatus}
          balances={balances}
          account={account}
          tcr={tcr}
          voting={voting}
          registry={registry}
        />
      </TransactionsWrapper>
    )
  }

  // personal message signature recovery
  handlePersonalSign = () => {
    this.props.onSendTransaction({ methodName: 'personalSign', args: [] })
  }
  // TRANSACTIONS
  handleApprove = contract => {
    const { parameters, tcr } = this.props
    let numTokens
    if (this.state.numTokens === '') {
      numTokens = convertedToBaseUnit(parameters.minDeposit, tcr.tokenDecimals)
    } else {
      numTokens = convertedToBaseUnit(this.state.numTokens, tcr.tokenDecimals)
    }
    const args = [this.props[contract].address, numTokens]
    this.props.onSendTransaction({ methodName: 'approve', args })
  }
  handleTransfer = () => {
    const { parameters, tcr } = this.props
    let numTokens
    if (this.state.numTokens === '') {
      numTokens = convertedToBaseUnit(parameters.minDeposit, tcr.tokenDecimals)
    } else {
      numTokens = convertedToBaseUnit(this.state.numTokens, tcr.tokenDecimals)
    }

    const args = [this.state.transferTo, numTokens]
    this.props.onSendTransaction({ methodName: 'transfer', args })
  }
  handleApply = () => {
    const { parameters, tcr } = this.props
    const numTokens = convertedToBaseUnit(parameters.minDeposit, tcr.tokenDecimals)
    const args = [this.state.listingID, numTokens, this.state.data]
    this.props.onSendTransaction({ methodName: 'apply', args })
  }
  handleChallenge = () => {
    const args = [this.props.sidePanelListing.listingHash, this.state.data]
    this.props.onSendTransaction({ methodName: 'challenge', args })
  }
  handleRequestVotingRights = () => {
    const args = [this.state.numTokens]
    this.props.onSendTransaction({ methodName: 'requestVotingRights', args })
  }
  handleCommitVote = (voteOption, salt) => {
    const args = [
      this.props.sidePanelListing.challengeID,
      voteOption,
      this.state.numTokens,
      salt,
    ]
    this.props.onSendTransaction({
      methodName: 'commitVote',
      args,
    })
  }
  handleRevealVote = (pollID, voteOption, salt) => {
    const args = [pollID, voteOption, salt]
    this.props.onSendTransaction({ methodName: 'revealVote', args })
  }
  handleUpdateStatus = listingHash => {
    const args = [listingHash]
    this.props.onSendTransaction({ methodName: 'updateStatus', args })
  }
  handleRescueTokens = listing => {
    const args = [listing.challengeID]
    this.props.onSendTransaction({ methodName: 'rescueTokens', args })
  }
  handleClaimReward = () => {
    const args = [this.props.sidePanelListing.challengeID, this.state.fileInput.salt]
    this.props.onSendTransaction({ methodName: 'claimReward', args })
  }
}

function mapDispatchToProps(dispatch) {
  return {
    onSendTransaction: payload => dispatch(txActions.sendTransactionStart(payload)),
    onOpenSidePanel: (selectedOne, methodName) =>
      dispatch(liActions.openSidePanel(selectedOne, methodName)),
  }
}

const mapStateToProps = createStructuredSelector({
  account: selectAccount,
  balances: selectBalances,
  tcr: selectTCR,
  registry: selectRegistry,
  voting: selectVoting,
  parameters: selectParameters,

  miningStatus: selectMiningStatus,
  latestTxn: selectLatestTxn,

  sidePanelListing: selectSidePanelListing,
  sidePanelMethod: selectSidePanelMethod,
})

const withConnect = connect(mapStateToProps, mapDispatchToProps)
export default compose(withConnect)(toJS(Transactions))
